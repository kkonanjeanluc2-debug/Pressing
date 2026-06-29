'use client'

import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { usePlan } from '@/hooks/usePlan'
import { useProfil } from '@/hooks/useProfil'
import { useProfilProprietaire } from '@/hooks/useProfilProprietaire'
import { changerStatutTicket } from '@/hooks/useTickets'
import { createClient } from '@/lib/supabase/client'
import { genererTicketPdf } from '@/lib/ticketPdf'
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

const MODES_ENCAISSEMENT: ModePaiement[] = [
  'cash',
  'wave',
  'orange_money',
  'mtn_money',
  'moov_money',
]

export default function TicketDetail({ ticket, pressing, recharger, nouveauticket }: TicketDetailProps) {
  const { peut } = useProfil()
  const { proprietaire } = useProfilProprietaire(pressing.owner_id)
  const { planAutorise } = usePlan(pressing.owner_id)
  const [modaleUpgrade, setModaleUpgrade] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [modalEncaissement, setModalEncaissement] = useState(false)
  const [envoiWhatsApp, setEnvoiWhatsApp] = useState(false)
  const [guideWhatsApp, setGuideWhatsApp] = useState(false)

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

  /** Télécharge le ticket en PDF A4. */
  async function telechargerPdf() {
    const doc = await genererTicketPdf(ticket, pressing, proprietaire)
    doc.save(`ticket-${ticket.numero.replace('#', '')}.pdf`)
  }

  /**
   * Envoie le récapitulatif du ticket sur WhatsApp.
   * - Mobile : ouvre directement la discussion WhatsApp du client (comme la relance créance).
   * - Ordinateur : télécharge le PDF et ouvre la discussion — il reste à joindre le fichier.
   */
  async function envoyerWhatsAppPdf() {
    if (!ticket.client) return
    setErreur(null)
    setInfo(null)
    setEnvoiWhatsApp(true)

    const estMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (estMobile) {
      // Mobile : ouvrir la discussion WhatsApp directement (même comportement que la relance créance)
      window.open(lienDiscussionClient, '_blank')
      setEnvoiWhatsApp(false)
      return
    }

    // Ordinateur : téléchargement du PDF puis guide pas-à-pas
    const doc = await genererTicketPdf(ticket, pressing, proprietaire)
    const nomFichier = `ticket-${ticket.numero.replace('#', '')}.pdf`
    doc.save(nomFichier)
    setGuideWhatsApp(true)
    setEnvoiWhatsApp(false)
  }

  /** Discussion WhatsApp du client (fonctionne même hors contacts). */
  const lienDiscussionClient = ticket.client
    ? `https://wa.me/225${ticket.client.telephone.replace(/\D/g, '').replace(/^225/, '')}?text=${encodeURIComponent(messageWhatsAppTicket)}`
    : ''

  async function changerStatut(statut: 'en_traitement' | 'pret' | 'recupere' | 'annule') {
    setEnCours(true)
    setErreur(null)
    const err = await changerStatutTicket(ticket.id, statut)
    if (err) setErreur(err)
    await recharger()
    setEnCours(false)
  }

  /**
   * Notifie le client sur SON WhatsApp : la discussion s'ouvre avec le
   * message « linge prêt », et le ticket est marqué comme notifié.
   */
  async function notifierWhatsApp() {
    if (!ticket.client) return
    setErreur(null)
    setInfo(null)

    const tel = ticket.client.telephone.replace(/\D/g, '').replace(/^225/, '')
    window.open(`https://wa.me/225${tel}?text=${encodeURIComponent(smsTexte)}`, '_blank')

    setEnCours(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('tickets')
      .update({ sms_envoye: true, sms_envoye_at: new Date().toISOString() })
      .eq('id', ticket.id)
    if (!error) {
      setInfo('Client notifié sur WhatsApp ✅')
      await recharger()
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

    const maj: Record<string, unknown> = {
      montant_paye: ticket.montant_paye + montant,
      mode_paiement: modeEncaissement,
    }
    if (ticket.statut !== 'recupere') {
      maj.statut = 'recupere'
      maj.date_recuperation = new Date().toISOString()
    }

    const { error: erreurMaj } = await supabase
      .from('tickets')
      .update(maj)
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
    {/* Impression depuis cette page = reçu de caisse 80mm */}
    <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } }`}</style>

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
              <span className="flex items-center gap-1.5">
                {a.couleur && (
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-300"
                    style={{ backgroundColor: a.couleur }}
                    title={a.couleur}
                  />
                )}
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
            Client notifié
            {ticket.sms_envoye_at ? ` le ${formatDateHeure(ticket.sms_envoye_at)}` : ''} ✓
          </p>
        )}
      </Card>

      {/* ---- Export et partage ---- */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => void telechargerPdf()}
          className="rounded-card border border-pressci-primary bg-white px-2 py-2.5 text-sm font-semibold text-pressci-primary active:bg-pressci-light"
        >
          📄 PDF A4
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-card border border-pressci-primary bg-white px-2 py-2.5 text-sm font-semibold text-pressci-primary active:bg-pressci-light"
        >
          🧾 Reçu caisse
        </button>
        {ticket.client && (
          <button
            type="button"
            onClick={() => void envoyerWhatsAppPdf()}
            disabled={envoiWhatsApp}
            className="flex items-center justify-center rounded-card bg-[#25D366] px-2 py-2.5 text-sm font-semibold text-white active:brightness-90 disabled:opacity-60"
          >
            {envoiWhatsApp ? <span className="spinner" /> : '💬 WhatsApp'}
          </button>
        )}
      </div>
      <p className="-mt-2 text-center text-xs text-gray-400">
        Mobile : ouvre directement la discussion WhatsApp. Ordinateur : télécharge le PDF puis ouvre WhatsApp.
      </p>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}
      {info && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>
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
              planAutorise('pro') ? (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => void notifierWhatsApp()}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-card bg-[#25D366] px-4 py-3 text-base font-semibold text-white active:brightness-90 disabled:opacity-60"
                >
                  💬 Notifier le client sur WhatsApp
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModaleUpgrade(true)}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-pressci-primary bg-pressci-light px-4 py-3 text-sm font-semibold text-pressci-primary"
                >
                  💬 Notifier sur WhatsApp — <span className="rounded-full bg-pressci-primary px-2 py-0.5 text-[10px] text-white">Pro</span>
                </button>
              )
            )}

            {/* Modale upgrade plan */}
            {modaleUpgrade && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
                  <p className="mb-2 text-3xl">🚀</p>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">Fonctionnalité Pro</h3>
                  <p className="mb-6 text-sm text-gray-500">
                    Les notifications WhatsApp clients sont disponibles à partir du plan{' '}
                    <strong>Pro (5 000 F/mois)</strong>. Passez au Pro pour notifier vos clients en un clic.
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href="/parametres"
                      className="rounded-full bg-pressci-primary py-3 text-sm font-bold text-white"
                      onClick={() => setModaleUpgrade(false)}
                    >
                      Passer au plan Pro →
                    </a>
                    <button
                      type="button"
                      onClick={() => setModaleUpgrade(false)}
                      className="py-2 text-sm text-gray-500"
                    >
                      Plus tard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {peut('changer_statut') && (resteAPayer === 0 || peut('encaisser')) && (
              <Button pleineLargeur chargement={enCours} onClick={() => void marquerRecupereSansEncaissement()}>
                Marquer récupéré {resteAPayer > 0 && `(encaisser ${formatFCFA(resteAPayer)})`}
              </Button>
            )}
          </>
        )}

{ticket.statut === 'recupere' && (
          <>
            {resteAPayer > 0 && peut('encaisser') ? (
              <Button
                pleineLargeur
                onClick={() => {
                  setMontantRecu(String(resteAPayer))
                  setModalEncaissement(true)
                }}
              >
                💰 Encaisser le solde restant ({formatFCFA(resteAPayer)})
              </Button>
            ) : (
              <p className="text-center text-sm text-gray-400">
                Ticket clôturé
                {ticket.date_recuperation
                  ? ` — récupéré le ${formatDateHeure(ticket.date_recuperation)}`
                  : ''}{' '}
                🧾
              </p>
            )}
          </>
        )}
      </div>

      {/* ---- Guide d'envoi WhatsApp (ordinateur) ---- */}
      {guideWhatsApp && ticket.client && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-4 rounded-card bg-white p-5">
            <h3 className="text-lg font-bold text-pressci-dark">
              Envoyer le PDF à {ticket.client.nom}
            </h3>

            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pressci-primary text-xs font-bold text-white">
                  1
                </span>
                <span>
                  ✅ Le ticket PDF vient d’être <strong>téléchargé</strong> (dossier
                  Téléchargements).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pressci-primary text-xs font-bold text-white">
                  2
                </span>
                <span>
                  Cliquez ci-dessous : la discussion de <strong>{ticket.client.nom}</strong> (
                  {ticket.client.telephone}) s’ouvre <strong>automatiquement</strong> — pas
                  besoin de l’avoir dans vos contacts.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pressci-primary text-xs font-bold text-white">
                  3
                </span>
                <span>
                  Dans la discussion : <strong>glissez-déposez le PDF</strong>, ou cliquez sur le
                  trombone 📎 → <strong>Document</strong> → choisissez le fichier, puis Envoyer.
                </span>
              </li>
            </ol>

            <a
              href={lienDiscussionClient}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setGuideWhatsApp(false)}
              className="flex items-center justify-center gap-2 rounded-card bg-[#25D366] px-4 py-3 font-semibold text-white active:brightness-90"
            >
              💬 Ouvrir la discussion de {ticket.client.nom}
            </a>

            <Button variante="ghost" pleineLargeur onClick={() => setGuideWhatsApp(false)}>
              Fermer
            </Button>
          </div>
        </div>
      )}

      {/* ---- Modal d'encaissement ---- */}
      {modalEncaissement && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-4 rounded-card bg-white p-5">
            <h3 className="text-lg font-bold text-pressci-dark">
            {ticket.statut === 'recupere' ? 'Encaisser le solde restant' : 'Encaissement final'}
          </h3>
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
                {ticket.statut === 'recupere' ? 'Encaisser' : 'Encaisser et clôturer'}
              </Button>
              <Button variante="ghost" pleineLargeur onClick={() => setModalEncaissement(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* ============ GABARIT REÇU DE CAISSE 80mm (impression uniquement) ============ */}
    {(
      <div className="hidden text-[11px] leading-snug text-gray-900 print:block">
        <div className="text-center">
          <p className="text-sm font-bold uppercase">{pressing.nom}</p>
          <p>{[pressing.adresse, pressing.commune].filter(Boolean).join(', ')}</p>
          {pressing.telephone && <p>Tél : {pressing.telephone}</p>}
          {proprietaire && (
            <p className="text-[9px]">
              {[
                proprietaire.nom,
                proprietaire.rccm ? `RCCM ${proprietaire.rccm}` : null,
                proprietaire.ncc ? `NCC ${proprietaire.ncc}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
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
              {a.couleur && ` (${a.couleur})`}
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
          Pressing Ivoire — {formatDate(new Date())} {formatHeure(new Date())}
        </p>
      </div>
    )}
    </>
  )
}
