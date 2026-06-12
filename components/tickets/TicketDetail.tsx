'use client'

import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { changerStatutTicket } from '@/hooks/useTickets'
import { createClient } from '@/lib/supabase/client'
import {
  estEnRetard,
  formatDate,
  formatDateHeure,
  formatFCFA,
  MODE_PAIEMENT_LABELS,
  messageSmsPret,
} from '@/lib/utils'
import type { ModePaiement, Pressing, Ticket } from '@/types'
import { useState } from 'react'

interface TicketDetailProps {
  ticket: Ticket
  pressing: Pressing
  recharger: () => Promise<void>
  nouveauticket?: boolean
}

const MODES_ENCAISSEMENT: ModePaiement[] = ['cash', 'wave', 'orange_money']

export default function TicketDetail({ ticket, pressing, recharger, nouveauticket }: TicketDetailProps) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [modalEncaissement, setModalEncaissement] = useState(false)
  const [messageWhatsApp, setMessageWhatsApp] = useState<string | null>(null)

  // Modal d'encaissement
  const resteAPayer = ticket.montant_total - ticket.montant_paye
  const [montantRecu, setMontantRecu] = useState(String(resteAPayer))
  const [modeEncaissement, setModeEncaissement] = useState<ModePaiement>('cash')

  const enRetard = estEnRetard(ticket.date_prevue, ticket.statut)
  const smsTexte = messageSmsPret(ticket.client?.nom ?? 'cher client', pressing.nom, ticket.numero)

  async function changerStatut(statut: 'en_traitement' | 'pret' | 'recupere' | 'annule') {
    setEnCours(true)
    setErreur(null)
    const err = await changerStatutTicket(ticket.id, statut)
    if (err) setErreur(err)
    await recharger()
    setEnCours(false)
  }

  async function envoyerSms() {
    setEnCours(true)
    setErreur(null)
    setInfo(null)
    setMessageWhatsApp(null)

    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticket.id }),
      })
      const data = (await res.json()) as { succes: boolean; erreur?: string }

      if (data.succes) {
        setInfo('SMS envoyé au client ✅')
        await recharger()
      } else {
        setErreur("Le SMS n'est pas parti. Vous pouvez envoyer le message par WhatsApp :")
        setMessageWhatsApp(smsTexte)
      }
    } catch {
      setErreur("Le SMS n'est pas parti. Vous pouvez envoyer le message par WhatsApp :")
      setMessageWhatsApp(smsTexte)
    }
    setEnCours(false)
  }

  async function encaisser() {
    const montant = parseInt(montantRecu, 10)
    if (Number.isNaN(montant) || montant <= 0) {
      setErreur('Entrez un montant valide.')
      return
    }
    if (montant > resteAPayer) {
      setErreur(`Le montant dépasse le reste à payer (${formatFCFA(resteAPayer)}).`)
      return
    }

    setEnCours(true)
    setErreur(null)
    const supabase = createClient()

    const { error: erreurMaj } = await supabase
      .from('tickets')
      .update({
        montant_paye: ticket.montant_paye + montant,
        mode_paiement: modeEncaissement,
        statut: 'recupere',
        date_recuperation: new Date().toISOString(),
      })
      .eq('id', ticket.id)

    if (erreurMaj) {
      setErreur("L'encaissement a échoué. Réessayez.")
      setEnCours(false)
      return
    }

    await supabase.from('encaissements').insert({
      pressing_id: ticket.pressing_id,
      ticket_id: ticket.id,
      montant,
      mode_paiement: modeEncaissement,
    })

    setModalEncaissement(false)
    await recharger()
    setEnCours(false)
  }

  async function marquerRecupereSansEncaissement() {
    if (resteAPayer > 0) {
      setModalEncaissement(true)
      return
    }
    await changerStatut('recupere')
  }

  return (
    <div className="space-y-4">
      {nouveauticket && (
        <div className="rounded-card border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
          ✅ Dépôt enregistré ! Vous pouvez notifier le client par SMS quand le linge sera prêt.
        </div>
      )}

      {/* ---- Fiche ticket ---- */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-pressci-primary" />
        <div className="mb-3 flex items-start justify-between pt-1">
          <div>
            <p className="text-2xl font-bold text-pressci-dark">{ticket.numero}</p>
            <p className="text-sm text-gray-500">{pressing.nom}</p>
          </div>
          <Badge statut={ticket.statut} />
        </div>

        <div className="space-y-1 border-b border-dashed border-gray-200 pb-3 text-sm">
          <p>
            <span className="text-gray-500">Client : </span>
            <span className="font-medium">{ticket.client?.nom}</span>
          </p>
          <p>
            <span className="text-gray-500">Téléphone : </span>
            <span className="font-medium">{ticket.client?.telephone}</span>
          </p>
          <p>
            <span className="text-gray-500">Déposé le : </span>
            <span className="font-medium">{formatDate(ticket.date_depot)}</span>
          </p>
          <p>
            <span className="text-gray-500">Retrait prévu : </span>
            <span className={enRetard ? 'font-semibold text-red-600' : 'font-medium'}>
              {formatDate(ticket.date_prevue)} {enRetard && '⚠ dépassé'}
            </span>
          </p>
          {ticket.date_recuperation && (
            <p>
              <span className="text-gray-500">Récupéré le : </span>
              <span className="font-medium">{formatDateHeure(ticket.date_recuperation)}</span>
            </p>
          )}
        </div>

        {/* Articles */}
        <div className="space-y-2 border-b border-dashed border-gray-200 py-3">
          {(ticket.articles ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span>
                {a.quantite} × {a.type_article}
              </span>
              <span className="font-medium">{formatFCFA(a.sous_total)}</span>
            </div>
          ))}
        </div>

        {/* Totaux */}
        <div className="space-y-1 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="text-base font-bold text-pressci-dark">
              {formatFCFA(ticket.montant_total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payé</span>
            <span className="font-medium text-green-700">{formatFCFA(ticket.montant_paye)}</span>
          </div>
          {resteAPayer > 0 && ticket.statut !== 'annule' && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reste à payer</span>
              <span className="font-semibold text-orange-600">{formatFCFA(resteAPayer)}</span>
            </div>
          )}
          {ticket.mode_paiement && (
            <div className="flex justify-between">
              <span className="text-gray-500">Mode de paiement</span>
              <span className="font-medium">{MODE_PAIEMENT_LABELS[ticket.mode_paiement]}</span>
            </div>
          )}
        </div>

        {ticket.notes && (
          <p className="mt-3 rounded-card bg-gray-50 px-3 py-2 text-sm text-gray-600">
            📝 {ticket.notes}
          </p>
        )}

        {ticket.sms_envoye && (
          <p className="mt-3 text-xs text-gray-400">
            SMS envoyé{ticket.sms_envoye_at ? ` le ${formatDateHeure(ticket.sms_envoye_at)}` : ''} ✓
          </p>
        )}
      </Card>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}
      {info && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>
      )}

      {/* Message WhatsApp de secours si le SMS échoue */}
      {messageWhatsApp && ticket.client && (
        <Card className="space-y-2">
          <p className="rounded-card bg-gray-50 px-3 py-2 text-sm text-gray-700">{messageWhatsApp}</p>
          <div className="flex gap-2">
            <Button
              variante="outline"
              className="flex-1"
              onClick={() => void navigator.clipboard.writeText(messageWhatsApp)}
            >
              Copier
            </Button>
            <a
              className="flex-1"
              href={`https://wa.me/225${ticket.client.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(messageWhatsApp)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variante="secondary" pleineLargeur>
                Ouvrir WhatsApp
              </Button>
            </a>
          </div>
        </Card>
      )}

      {/* ---- Actions selon le statut ---- */}
      <div className="space-y-2">
        {ticket.statut === 'nouveau' && (
          <Button pleineLargeur chargement={enCours} onClick={() => void changerStatut('en_traitement')}>
            Démarrer le traitement
          </Button>
        )}

        {ticket.statut === 'en_traitement' && (
          <Button pleineLargeur chargement={enCours} onClick={() => void changerStatut('pret')}>
            Marquer prêt
          </Button>
        )}

        {ticket.statut === 'pret' && (
          <>
            {!ticket.sms_envoye && (
              <Button pleineLargeur chargement={enCours} variante="secondary" onClick={() => void envoyerSms()}>
                📱 Notifier le client par SMS
              </Button>
            )}
            <Button pleineLargeur chargement={enCours} onClick={() => void marquerRecupereSansEncaissement()}>
              Marquer récupéré {resteAPayer > 0 && `(encaisser ${formatFCFA(resteAPayer)})`}
            </Button>
          </>
        )}

        {(ticket.statut === 'nouveau' || ticket.statut === 'en_traitement') && (
          <Button
            pleineLargeur
            variante="ghost"
            chargement={enCours}
            onClick={() => {
              if (window.confirm('Annuler ce ticket ? Cette action est définitive.')) {
                void changerStatut('annule')
              }
            }}
          >
            Annuler le ticket
          </Button>
        )}

        {ticket.statut === 'recupere' && (
          <p className="text-center text-sm text-gray-400">
            Ticket clôturé — reçu ci-dessus 🧾
          </p>
        )}
      </div>

      {/* ---- Modal d'encaissement ---- */}
      {modalEncaissement && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-4 rounded-card bg-white p-5">
            <h3 className="text-lg font-bold text-pressci-dark">Encaissement final</h3>
            <p className="text-sm text-gray-600">
              Reste à payer : <strong>{formatFCFA(resteAPayer)}</strong>
            </p>

            <div>
              <label htmlFor="montant_recu" className="mb-1 block text-sm font-medium text-gray-700">
                Montant reçu (FCFA)
              </label>
              <input
                id="montant_recu"
                type="number"
                min={0}
                step={50}
                value={montantRecu}
                onChange={(e) => setMontantRecu(e.target.value)}
                className="w-full rounded-card border border-gray-300 px-3 py-3 outline-none focus:border-pressci-primary"
              />
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Mode de paiement</span>
              <div className="grid grid-cols-3 gap-2">
                {MODES_ENCAISSEMENT.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setModeEncaissement(mode)}
                    className={`rounded-card border px-2 py-2.5 text-xs font-medium ${
                      modeEncaissement === mode
                        ? 'border-pressci-primary bg-pressci-light text-pressci-dark'
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    {MODE_PAIEMENT_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>

            {parseInt(montantRecu, 10) < resteAPayer && (
              <p className="rounded-card bg-orange-50 px-3 py-2 text-xs text-orange-700">
                Il restera {formatFCFA(resteAPayer - (parseInt(montantRecu, 10) || 0))} de créance
                sur la fiche du client.
              </p>
            )}

            <div className="space-y-2">
              <Button pleineLargeur chargement={enCours} onClick={() => void encaisser()}>
                Encaisser et clôturer
              </Button>
              <Button variante="ghost" pleineLargeur onClick={() => setModalEncaissement(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
