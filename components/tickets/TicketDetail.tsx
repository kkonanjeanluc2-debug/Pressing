'use client'

import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useProfil } from '@/hooks/useProfil'
import { changerStatutTicket } from '@/hooks/useTickets'
import { createClient } from '@/lib/supabase/client'
import {
  estEnRetard,
  formatDate,
  formatDateHeure,
  formatFCFA,
  formatHeure,
  MODE_PAIEMENT_LABELS,
  messageSmsPret,
  STATUT_LABELS,
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
  const { peut } = useProfil()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [modalEncaissement, setModalEncaissement] = useState(false)
  const [messageWhatsApp, setMessageWhatsApp] = useState<string | null>(null)
  const [formatImpression, setFormatImpression] = useState<'a4' | 'recu'>('a4')

  // Modal d'encaissement
  const resteAPayer = ticket.montant_total - ticket.montant_paye
  const [montantRecu, setMontantRecu] = useState(String(resteAPayer))
  const [modeEncaissement, setModeEncaissement] = useState<ModePaiement>('cash')

  const enRetard = estEnRetard(ticket.date_prevue, ticket.statut)
  const smsTexte = messageSmsPret(ticket.client?.nom ?? 'cher client', pressing.nom, ticket.numero)
  const nbPieces = (ticket.articles ?? []).reduce((s, a) => s + a.quantite, 0)

  /** Récapitulatif du ticket envoyé sur le WhatsApp du client. */
  const messageWhatsAppTicket =
    ticket.statut === 'pret'
      ? smsTexte
      : `Bonjour ${ticket.client?.nom ?? ''}, votre dépôt ${ticket.numero} au ${pressing.nom} : ` +
        `${nbPieces} pièce${nbPieces > 1 ? 's' : ''}, total ${formatFCFA(ticket.montant_total)}` +
        (resteAPayer > 0 ? ` (reste à payer ${formatFCFA(resteAPayer)})` : '') +
        `. Retrait prévu le ${formatDate(ticket.date_prevue)}. Merci de votre confiance !`

  const lienWhatsApp = ticket.client
    ? `https://wa.me/225${ticket.client.telephone.replace(/\D/g, '').replace(/^225/, '')}?text=${encodeURIComponent(messageWhatsAppTicket)}`
    : null

  /** Lance l'impression dans le format choisi (PDF via le navigateur). */
  function imprimer(format: 'a4' | 'recu') {
    setFormatImpression(format)
    setTimeout(() => window.print(), 150)
  }

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
    <>
    {/* Format de page selon le type d'export */}
    {formatImpression === 'recu' ? (
      <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } }`}</style>
    ) : (
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>
    )}

    <div className="space-y-4 print:hidden">
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
            <span className="font-medium">{formatDateHeure(ticket.date_depot)}</span>
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
              <span className="font-semibold text-green-700">
                {formatDateHeure(ticket.date_recuperation)}
              </span>
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

      {/* ---- Export et partage ---- */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => imprimer('a4')}
          className="rounded-card border border-pressci-primary bg-white px-2 py-2.5 text-sm font-semibold text-pressci-primary active:bg-pressci-light"
        >
          📄 PDF A4
        </button>
        <button
          type="button"
          onClick={() => imprimer('recu')}
          className="rounded-card border border-pressci-primary bg-white px-2 py-2.5 text-sm font-semibold text-pressci-primary active:bg-pressci-light"
        >
          🧾 Reçu caisse
        </button>
        {lienWhatsApp && (
          <a
            href={lienWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-card bg-[#25D366] px-2 py-2.5 text-sm font-semibold text-white active:brightness-90"
          >
            💬 WhatsApp
          </a>
        )}
      </div>

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

      {/* ---- Actions selon le statut (et les permissions de l'agent) ---- */}
      <div className="space-y-2">
        {ticket.statut === 'nouveau' && peut('changer_statut') && (
          <Button pleineLargeur chargement={enCours} onClick={() => void changerStatut('en_traitement')}>
            Démarrer le traitement
          </Button>
        )}

        {ticket.statut === 'en_traitement' && peut('changer_statut') && (
          <Button pleineLargeur chargement={enCours} onClick={() => void changerStatut('pret')}>
            Marquer prêt
          </Button>
        )}

        {ticket.statut === 'pret' && (
          <>
            {!ticket.sms_envoye && peut('envoyer_sms') && (
              <Button pleineLargeur chargement={enCours} variante="secondary" onClick={() => void envoyerSms()}>
                📱 Notifier le client par SMS
              </Button>
            )}
            {peut('changer_statut') && (resteAPayer === 0 || peut('encaisser')) && (
              <Button pleineLargeur chargement={enCours} onClick={() => void marquerRecupereSansEncaissement()}>
                Marquer récupéré {resteAPayer > 0 && `(encaisser ${formatFCFA(resteAPayer)})`}
              </Button>
            )}
          </>
        )}

        {(ticket.statut === 'nouveau' || ticket.statut === 'en_traitement') &&
          peut('changer_statut') && (
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
            Ticket clôturé
            {ticket.date_recuperation
              ? ` — récupéré le ${formatDateHeure(ticket.date_recuperation)}`
              : ''}{' '}
            🧾
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

    {/* ================= GABARIT A4 (impression uniquement) ================= */}
    {formatImpression === 'a4' && (
      <div className="hidden print:block">
        {/* En-tête */}
        <div className="flex items-start justify-between rounded-card bg-pressci-dark p-5 text-white">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pressci-accent text-base font-bold text-pressci-dark">
                P
              </span>
              <span className="text-sm font-semibold text-pressci-accent">
                PressCI — Gestion de pressing
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{pressing.nom}</h1>
            <p className="text-sm text-pressci-light/90">
              {[pressing.adresse, pressing.commune].filter(Boolean).join(', ')}
            </p>
            {pressing.telephone && (
              <p className="text-sm text-pressci-light/90">Tél : {pressing.telephone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide text-pressci-accent">
              Ticket de dépôt
            </p>
            <p className="text-3xl font-bold text-white">{ticket.numero}</p>
            <p className="text-xs text-pressci-light/80">
              Édité le {formatDate(new Date())} à {formatHeure(new Date())}
            </p>
          </div>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-pressci-accent" />

        {/* Client et dates */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-card border border-gray-200 p-3">
            <p className="text-xs font-semibold uppercase text-gray-400">Client</p>
            <p className="text-base font-bold text-gray-900">{ticket.client?.nom}</p>
            <p className="text-sm text-gray-600">{ticket.client?.telephone}</p>
          </div>
          <div className="rounded-card border border-gray-200 p-3 text-sm">
            <p>
              <span className="text-gray-500">Déposé le : </span>
              <span className="font-medium">{formatDateHeure(ticket.date_depot)}</span>
            </p>
            <p>
              <span className="text-gray-500">Retrait prévu : </span>
              <span className="font-medium">{formatDate(ticket.date_prevue)}</span>
            </p>
            {ticket.date_recuperation && (
              <p>
                <span className="text-gray-500">Récupéré le : </span>
                <span className="font-semibold text-pressci-primary">
                  {formatDateHeure(ticket.date_recuperation)}
                </span>
              </p>
            )}
            <p>
              <span className="text-gray-500">Statut : </span>
              <span className="font-semibold">{STATUT_LABELS[ticket.statut]}</span>
            </p>
          </div>
        </div>

        {/* Articles */}
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-pressci-primary text-left text-white">
              <th className="rounded-l px-3 py-2 font-semibold">Article</th>
              <th className="px-3 py-2 text-center font-semibold">Qté</th>
              <th className="px-3 py-2 text-right font-semibold">Prix unitaire</th>
              <th className="rounded-r px-3 py-2 text-right font-semibold">Sous-total</th>
            </tr>
          </thead>
          <tbody>
            {(ticket.articles ?? []).map((a) => (
              <tr key={a.id} className="border-b border-gray-200">
                <td className="px-3 py-2">{a.type_article}</td>
                <td className="px-3 py-2 text-center">{a.quantite}</td>
                <td className="px-3 py-2 text-right">{formatFCFA(a.prix_unitaire)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatFCFA(a.sous_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className="mt-4 ml-auto w-72 space-y-1 text-sm">
          <div className="flex justify-between rounded-card bg-pressci-light px-3 py-2">
            <span className="font-semibold text-pressci-dark">TOTAL</span>
            <span className="text-base font-bold text-pressci-dark">
              {formatFCFA(ticket.montant_total)}
            </span>
          </div>
          <div className="flex justify-between px-3 py-1">
            <span className="text-gray-500">Payé</span>
            <span className="font-medium text-pressci-primary">
              {formatFCFA(ticket.montant_paye)}
            </span>
          </div>
          {resteAPayer > 0 && ticket.statut !== 'annule' && (
            <div className="flex justify-between rounded-card bg-orange-50 px-3 py-1.5">
              <span className="font-semibold text-orange-700">Reste à payer</span>
              <span className="font-bold text-orange-700">{formatFCFA(resteAPayer)}</span>
            </div>
          )}
          {ticket.mode_paiement && (
            <div className="flex justify-between px-3 py-1">
              <span className="text-gray-500">Mode de paiement</span>
              <span className="font-medium">{MODE_PAIEMENT_LABELS[ticket.mode_paiement]}</span>
            </div>
          )}
        </div>

        {ticket.notes && (
          <p className="mt-4 rounded-card border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            📝 {ticket.notes}
          </p>
        )}

        <div className="mt-8 rounded-full bg-pressci-light px-4 py-1.5 text-center text-[10px] font-medium text-pressci-dark">
          Merci de votre confiance ! Présentez ce ticket au retrait de votre linge. — Document
          généré par PressCI le {formatDate(new Date())} à {formatHeure(new Date())}
        </div>
      </div>
    )}

    {/* ============ GABARIT REÇU DE CAISSE 80mm (impression uniquement) ============ */}
    {formatImpression === 'recu' && (
      <div className="hidden text-[11px] leading-snug text-gray-900 print:block">
        <div className="text-center">
          <p className="text-sm font-bold uppercase">{pressing.nom}</p>
          <p>{[pressing.adresse, pressing.commune].filter(Boolean).join(', ')}</p>
          {pressing.telephone && <p>Tél : {pressing.telephone}</p>}
        </div>
        <p className="my-1 border-t border-dashed border-gray-500" />
        <div className="flex justify-between font-bold">
          <span>TICKET {ticket.numero}</span>
          <span>{STATUT_LABELS[ticket.statut]}</span>
        </div>
        <p>Déposé : {formatDateHeure(ticket.date_depot)}</p>
        <p>Retrait prévu : {formatDate(ticket.date_prevue)}</p>
        {ticket.date_recuperation && (
          <p className="font-semibold">Récupéré : {formatDateHeure(ticket.date_recuperation)}</p>
        )}
        <p>
          Client : {ticket.client?.nom} ({ticket.client?.telephone})
        </p>
        <p className="my-1 border-t border-dashed border-gray-500" />
        {(ticket.articles ?? []).map((a) => (
          <div key={a.id} className="flex justify-between">
            <span>
              {a.quantite} x {a.type_article}
            </span>
            <span>{a.sous_total.toLocaleString('fr-FR')}</span>
          </div>
        ))}
        <p className="my-1 border-t border-dashed border-gray-500" />
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatFCFA(ticket.montant_total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Payé</span>
          <span>{formatFCFA(ticket.montant_paye)}</span>
        </div>
        {resteAPayer > 0 && ticket.statut !== 'annule' && (
          <div className="flex justify-between font-bold">
            <span>RESTE À PAYER</span>
            <span>{formatFCFA(resteAPayer)}</span>
          </div>
        )}
        {ticket.mode_paiement && <p>Paiement : {MODE_PAIEMENT_LABELS[ticket.mode_paiement]}</p>}
        {ticket.notes && <p>Note : {ticket.notes}</p>}
        <p className="my-1 border-t border-dashed border-gray-500" />
        <p className="text-center font-semibold">Merci de votre confiance !</p>
        <p className="text-center">Présentez ce ticket au retrait.</p>
        <p className="mt-1 text-center text-[9px] text-gray-500">
          PressCI — {formatDate(new Date())} {formatHeure(new Date())}
        </p>
      </div>
    )}
    </>
  )
}
