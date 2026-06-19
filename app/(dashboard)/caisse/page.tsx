'use client'

import Button from '@/components/ui/Button'
import SansPressing from '@/components/ui/SansPressing'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import { useProfilProprietaire } from '@/hooks/useProfilProprietaire'
import { createClient } from '@/lib/supabase/client'
import {
  formatDate,
  formatFCFA,
  formatHeure,
  MODE_PAIEMENT_LABELS,
  toInputDate,
} from '@/lib/utils'
import type { ModePaiement, Pressing } from '@/types'
import Link from 'next/link'
import { useState } from 'react'

interface EncaissementAvecTicket {
  id: string
  pressing_id: string
  montant: number
  mode_paiement: ModePaiement
  created_at: string
  ticket?: { numero: string; client?: { nom: string } }
}

interface DonneesCaisse {
  encaissements: EncaissementAvecTicket[]
}

type Periode = 'jour' | 'semaine' | 'mois' | 'perso'

const PERIODES: { id: Periode; label: string }[] = [
  { id: 'jour', label: "Aujourd'hui" },
  { id: 'semaine', label: '7 jours' },
  { id: 'mois', label: 'Ce mois' },
  { id: 'perso', label: 'Dates' },
]

const TITRE_PERIODE: Record<Periode, string> = {
  jour: 'du jour',
  semaine: '— 7 derniers jours',
  mois: '— ce mois',
  perso: '— période personnalisée',
}

function debutJour(decalageJours = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + decalageJours)
  d.setHours(0, 0, 0, 0)
  return d
}

function debutMois(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function LigneEncaissement({ e }: { e: EncaissementAvecTicket }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-gray-200 bg-white p-3 print:rounded-none print:border-x-0 print:border-t-0 print:px-0">
      <div>
        <p className="text-sm font-medium text-gray-800">
          {e.ticket?.numero ?? ''} · {e.ticket?.client?.nom ?? 'Client'}
        </p>
        <p className="text-xs text-gray-500">
          {new Date(e.created_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          · {MODE_PAIEMENT_LABELS[e.mode_paiement]}
        </p>
      </div>
      <span className="font-semibold text-green-700">+{formatFCFA(e.montant)}</span>
    </div>
  )
}

export default function CaissePage() {
  const { pressing, pressings, chargement: chargementPressing } = usePressing()
  const { role, agent, peut, chargement: chargementProfil } = useProfil()
  const { proprietaire } = useProfilProprietaire(pressings[0]?.owner_id ?? null)
  const [pressingFiltre, setPressingFiltre] = useState<string>('tous')
  const [periodeActive, setPeriodeActive] = useState<Periode>('jour')
  const [dateDebut, setDateDebut] = useState(toInputDate(new Date()))
  const [dateFin, setDateFin] = useState(toInputDate(new Date()))

  const idsTous = pressings.map((p) => p.id)
  const idsSelection =
    pressingFiltre === 'tous' ? idsTous : idsTous.filter((id) => id === pressingFiltre)

  const debut =
    periodeActive === 'semaine'
      ? debutJour(-6)
      : periodeActive === 'mois'
        ? debutMois()
        : periodeActive === 'perso'
          ? new Date(dateDebut + 'T00:00:00')
          : debutJour()

  const fin =
    periodeActive === 'perso' ? new Date(dateFin + 'T23:59:59') : new Date()

  const clePeriode =
    periodeActive === 'perso' ? `${dateDebut}_${dateFin}` : `${periodeActive}_${toInputDate(new Date())}`

  const { donnees, chargement, erreur } = useDonneesCachees<DonneesCaisse>(
    idsSelection.length > 0 && (periodeActive !== 'perso' || dateDebut <= dateFin)
      ? `caisse_${idsSelection.join('_')}_${clePeriode}`
      : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('encaissements')
        .select('*, ticket:tickets(numero, client:clients(nom))')
        .in('pressing_id', idsSelection)
        .gte('created_at', debut.toISOString())
        .lte('created_at', fin.toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      return { encaissements: (data ?? []) as EncaissementAvecTicket[] }
    },
    'Impossible de charger la caisse. Vérifiez votre réseau.'
  )

  if (!chargementPressing && !pressing) return <SansPressing />

  if (!chargementProfil && !peut('voir_caisse')) {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🔒</p>
        <p className="font-semibold">Accès non autorisé.</p>
        <p className="mt-1 text-sm">
          Le propriétaire ne vous a pas donné l’accès à la caisse.
        </p>
      </div>
    )
  }

  const encaissements = donnees?.encaissements ?? []
  const totalPeriode = encaissements.reduce((s, e) => s + e.montant, 0)
  const parMode = encaissements.reduce<Partial<Record<ModePaiement, number>>>((acc, e) => {
    acc[e.mode_paiement] = (acc[e.mode_paiement] ?? 0) + e.montant
    return acc
  }, {})

  // Pressing affiché en en-tête du document : celui sélectionné, ou l'unique
  // pressing visible (cas de l'agent / propriétaire mono-pressing)
  const pressingSelectionne: Pressing | null =
    pressingFiltre !== 'tous'
      ? pressings.find((p) => p.id === pressingFiltre) ?? null
      : pressings.length === 1
        ? pressings[0] ?? null
        : null

  // Vue globale du propriétaire : encaissements classés par pressing
  const groupesParPressing = pressingSelectionne
    ? null
    : pressings
        .map((p) => ({
          pressing: p,
          lignes: encaissements.filter((e) => e.pressing_id === p.id),
        }))
        .filter((g) => g.lignes.length > 0)

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5 print:max-w-none print:space-y-3 print:px-0 print:pt-0">
      {/* ====== En-tête du document imprimé ====== */}
      <div className="hidden print:block">
        <div className="flex items-start justify-between rounded-card bg-pressci-dark p-5 text-white">
          <div>
            <div className="mb-2 flex items-center gap-2">
              {proprietaire?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proprietaire.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-0.5" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pressci-accent text-base font-bold text-pressci-dark">P</span>
              )}
            </div>
            {/* Identité du propriétaire (entreprise ou personne physique) */}
            <h1 className="text-2xl font-bold text-white">
              {proprietaire?.nom ??
                (pressingSelectionne
                  ? pressingSelectionne.nom
                  : `Tous les pressings (${pressings.length})`)}
            </h1>
            {proprietaire?.type_compte === 'entreprise' && (proprietaire.rccm || proprietaire.ncc) && (
              <p className="text-xs text-pressci-light/80">
                {[
                  proprietaire.rccm ? `RCCM : ${proprietaire.rccm}` : null,
                  proprietaire.ncc ? `NCC : ${proprietaire.ncc}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {proprietaire?.telephone && (
              <p className="text-xs text-pressci-light/80">Tél : {proprietaire.telephone}</p>
            )}
            {pressingSelectionne && (
              <p className="mt-1 text-sm font-semibold text-pressci-light">
                {pressingSelectionne.nom}
                {[pressingSelectionne.adresse, pressingSelectionne.commune].filter(Boolean).join(', ')
                  ? ` — ${[pressingSelectionne.adresse, pressingSelectionne.commune].filter(Boolean).join(', ')}`
                  : ''}
              </p>
            )}
            <p className="mt-1 text-sm text-pressci-light/90">
              {periodeActive === 'perso'
                ? `Période du ${formatDate(new Date(dateDebut + 'T00:00:00'))} au ${formatDate(new Date(dateFin + 'T00:00:00'))}`
                : periodeActive === 'jour'
                ? `Caisse du ${formatDate(new Date())}`
                : periodeActive === 'semaine'
                ? `7 derniers jours (au ${formatDate(new Date())})`
                : `Mois de ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide text-pressci-accent">
              Rapport de caisse
            </p>
            <p className="text-sm text-white">{formatDate(new Date())}</p>
            <p className="text-xs text-pressci-light/80">
              Édité à {formatHeure(new Date())}
              {role === 'agent' && agent ? ` par ${agent.nom} (agent)` : ' par le propriétaire'}
            </p>
          </div>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-pressci-accent" />
      </div>

      {/* ====== En-tête écran ====== */}
      <header className="flex items-center gap-3 print:hidden">
        <Link
          href="/"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
        >
          ←
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-pressci-dark">
            Caisse {TITRE_PERIODE[periodeActive]}
          </h1>
          <p className="text-sm text-gray-500">{formatDate(new Date())}</p>
        </div>
        <Link
          href="/comptabilite"
          className="shrink-0 text-sm font-semibold text-pressci-primary"
        >
          Comptabilité →
        </Link>
      </header>

      {/* Sélecteur de période */}
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          {PERIODES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodeActive(p.id)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                periodeActive === p.id
                  ? 'bg-pressci-primary text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {periodeActive === 'perso' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="flex-1 rounded-card border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-pressci-primary"
            />
            <span className="text-sm text-gray-400">→</span>
            <input
              type="date"
              value={dateFin}
              min={dateDebut}
              onChange={(e) => setDateFin(e.target.value)}
              className="flex-1 rounded-card border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-pressci-primary"
            />
          </div>
        )}
      </div>

      {/* Filtre par pressing (propriétaire multi-pressings) */}
      {pressings.length > 1 && (
        <select
          value={pressingFiltre}
          onChange={(e) => setPressingFiltre(e.target.value)}
          aria-label="Filtrer par pressing"
          className="w-full rounded-card border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-pressci-primary print:hidden lg:max-w-xs"
        >
          <option value="tous">Tous les pressings</option>
          {pressings.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
              {p.commune ? ` — ${p.commune}` : ''}
            </option>
          ))}
        </select>
      )}

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          {erreur}
        </p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : (
        <>
          {/* Total encaissé — uniquement le montant */}
          <div className="rounded-card border border-gray-200 bg-white p-5 text-center">
            <p className="text-3xl font-bold text-pressci-primary">{formatFCFA(totalPeriode)}</p>
          </div>

          {/* Totaux par mode de paiement */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {(
              [
                { mode: 'cash' as ModePaiement, classes: 'border-green-200 bg-green-50', texte: 'text-green-800' },
                { mode: 'wave' as ModePaiement, classes: 'border-blue-200 bg-blue-50', texte: 'text-blue-800' },
                { mode: 'orange_money' as ModePaiement, classes: 'border-orange-200 bg-orange-50', texte: 'text-orange-800' },
                { mode: 'mtn_money' as ModePaiement, classes: 'border-yellow-300 bg-yellow-50', texte: 'text-yellow-800' },
                { mode: 'moov_money' as ModePaiement, classes: 'border-indigo-200 bg-indigo-50', texte: 'text-indigo-800' },
              ]
            ).map(({ mode, classes, texte }) => (
              <div key={mode} className={`rounded-card border p-4 text-center ${classes}`}>
                <p className={`text-xs ${texte} opacity-80`}>{MODE_PAIEMENT_LABELS[mode]}</p>
                <p className={`text-sm font-bold ${texte}`}>{formatFCFA(parMode[mode] ?? 0)}</p>
              </div>
            ))}
          </div>

          {/* Liste des encaissements */}
          {encaissements.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Aucun encaissement sur cette période.
            </p>
          ) : groupesParPressing ? (
            /* ---- Vue globale : classée par pressing avec sous-totaux ---- */
            <div className="space-y-4">
              {groupesParPressing.map(({ pressing, lignes }) => {
                const sousTotal = lignes.reduce((s, e) => s + e.montant, 0)
                return (
                  <section key={pressing.id}>
                    <div className="mb-2 flex items-center justify-between rounded-card bg-pressci-primary px-3 py-2 text-white">
                      <h2 className="text-sm font-bold">
                        🏪 {pressing.nom}
                        {pressing.commune ? (
                          <span className="ml-1 font-normal text-pressci-light/90">
                            — {pressing.commune}
                          </span>
                        ) : null}
                      </h2>
                      <span className="text-xs text-pressci-light/90">
                        {lignes.length} encaissement{lignes.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-2 print:space-y-0">
                      {lignes.map((e) => (
                        <LigneEncaissement key={e.id} e={e} />
                      ))}
                    </div>
                    <p className="mt-2 rounded-card bg-pressci-light px-3 py-1.5 text-right text-sm font-bold text-pressci-dark">
                      Sous-total {pressing.nom} : {formatFCFA(sousTotal)}
                    </p>
                  </section>
                )
              })}
            </div>
          ) : (
            /* ---- Vue d'un seul pressing ---- */
            <section>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                Encaissements ({encaissements.length})
              </h2>
              <div className="space-y-2 print:space-y-0">
                {encaissements.map((e) => (
                  <LigneEncaissement key={e.id} e={e} />
                ))}
              </div>
            </section>
          )}

          {/* ====== Pied du document imprimé : signatures ====== */}
          <div className="hidden pt-12 print:block">
            <div className="flex justify-between gap-10">
              <div className="flex-1">
                <p className="mb-10 text-xs font-semibold uppercase text-pressci-dark">
                  {role === 'agent' ? 'Signature de l’agent' : 'Signature du caissier'}
                </p>
                <div className="border-t-2 border-pressci-primary" />
              </div>
              <div className="flex-1">
                <p className="mb-10 text-xs font-semibold uppercase text-pressci-dark">
                  Visa du propriétaire
                </p>
                <div className="border-t-2 border-pressci-primary" />
              </div>
            </div>
            <div className="mt-6 rounded-full bg-pressci-light px-4 py-1.5 text-center text-[10px] font-medium text-pressci-dark">
              Document généré par Pressing Ivoire le {formatDate(new Date())} à {formatHeure(new Date())}
            </div>
          </div>

          <div className="print:hidden">
            <Button pleineLargeur variante="outline" onClick={() => window.print()}>
              🧾 Imprimer / exporter en PDF
            </Button>
            {pressings.length > 1 && (
              <p className="mt-1 text-center text-xs text-gray-400">
                Astuce : choisissez un pressing dans le filtre pour télécharger sa caisse seule.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
