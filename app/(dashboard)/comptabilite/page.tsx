'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import { createClient } from '@/lib/supabase/client'
import {
  COMPTE_PRODUITS,
  COMPTES_CHARGES,
  compteTresorerie,
  intituleCompteCharge,
  MODES_DEPENSE,
  type ModeDepense,
} from '@/lib/syscohada'
import { formatDate, formatDateCourte, formatFCFA, formatHeure, toInputDate } from '@/lib/utils'
import type { Depense } from '@/types'
import { useState, type FormEvent } from 'react'

type Onglet = 'journal' | 'depenses' | 'resultat' | 'balance'

interface LigneRecette {
  id: string
  pressing_id: string
  montant: number
  mode_paiement: string
  created_at: string
  ticket?: { numero: string; client?: { nom: string } }
}

interface DonneesCompta {
  recettes: LigneRecette[]
  depenses: Depense[]
}

interface EcritureJournal {
  id: string
  date: string
  piece: string
  libelle: string
  compteDebit: string
  intituleDebit: string
  compteCredit: string
  intituleCredit: string
  montant: number
}

interface LigneBalance {
  code: string
  intitule: string
  debit: number
  credit: number
}

const ONGLETS: Array<{ id: Onglet; label: string }> = [
  { id: 'journal', label: 'Journal' },
  { id: 'depenses', label: 'Dépenses' },
  { id: 'resultat', label: 'Compte de résultat' },
  { id: 'balance', label: 'Balance' },
]

function debutDuMois(): string {
  const d = new Date()
  d.setDate(1)
  return toInputDate(d)
}

export default function ComptabilitePage() {
  const { pressings } = usePressing()
  const { role, peut, chargement: chargementProfil } = useProfil()

  const [onglet, setOnglet] = useState<Onglet>('journal')
  const [pressingFiltre, setPressingFiltre] = useState<string>('tous')
  const [dateDebut, setDateDebut] = useState(debutDuMois())
  const [dateFin, setDateFin] = useState(toInputDate(new Date()))

  // Formulaire de dépense
  const [libelle, setLibelle] = useState('')
  const [compte, setCompte] = useState('604')
  const [montant, setMontant] = useState('')
  const [modeDepense, setModeDepense] = useState<ModeDepense>('cash')
  const [reference, setReference] = useState('')
  const [dateDepense, setDateDepense] = useState(toInputDate(new Date()))
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreurForm, setErreurForm] = useState<string | null>(null)

  const idsTous = pressings.map((p) => p.id)
  const idsSelection =
    pressingFiltre === 'tous' ? idsTous : idsTous.filter((id) => id === pressingFiltre)

  const { donnees, chargement, erreur, recharger } = useDonneesCachees<DonneesCompta>(
    idsSelection.length > 0
      ? `compta_${idsSelection.join('_')}_${dateDebut}_${dateFin}`
      : null,
    async () => {
      const supabase = createClient()
      const [enc, dep] = await Promise.all([
        supabase
          .from('encaissements')
          .select('id, pressing_id, montant, mode_paiement, created_at, ticket:tickets(numero, client:clients(nom))')
          .in('pressing_id', idsSelection)
          .gte('created_at', new Date(`${dateDebut}T00:00:00`).toISOString())
          .lte('created_at', new Date(`${dateFin}T23:59:59`).toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('depenses')
          .select('*')
          .in('pressing_id', idsSelection)
          .gte('date_depense', dateDebut)
          .lte('date_depense', dateFin)
          .order('date_depense', { ascending: false }),
      ])
      if (enc.error || dep.error) throw enc.error ?? dep.error
      return {
        recettes: (enc.data ?? []) as unknown as LigneRecette[],
        depenses: (dep.data ?? []) as Depense[],
      }
    },
    'Impossible de charger la comptabilité. Vérifiez votre réseau.'
  )

  // ---- Garde d'accès : propriétaire, ou agent avec la permission ----
  if (!chargementProfil && role === 'agent' && !peut('gerer_depenses')) {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🔒</p>
        <p className="font-semibold">Accès non autorisé.</p>
        <p className="mt-1 text-sm">
          Le propriétaire ne vous a pas donné l’accès à la comptabilité.
        </p>
      </div>
    )
  }

  const recettes = donnees?.recettes ?? []
  const depenses = donnees?.depenses ?? []

  const totalRecettes = recettes.reduce((s, r) => s + r.montant, 0)
  const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0)
  const resultat = totalRecettes - totalDepenses

  // ---- Journal : écritures débit / crédit ----
  const ecritures: EcritureJournal[] = [
    ...recettes.map((r): EcritureJournal => {
      const treso = compteTresorerie(r.mode_paiement)
      return {
        id: `R-${r.id}`,
        date: r.created_at,
        piece: r.ticket?.numero ?? '—',
        libelle: `Encaissement ${r.ticket?.numero ?? ''} — ${r.ticket?.client?.nom ?? 'Client'}`,
        compteDebit: treso.code,
        intituleDebit: treso.intitule,
        compteCredit: COMPTE_PRODUITS.code,
        intituleCredit: COMPTE_PRODUITS.intitule,
        montant: r.montant,
      }
    }),
    ...depenses.map((d): EcritureJournal => {
      const treso = compteTresorerie(d.mode_paiement)
      return {
        id: `D-${d.id}`,
        date: `${d.date_depense}T12:00:00`,
        piece: d.reference ?? '—',
        libelle: d.libelle,
        compteDebit: d.compte,
        intituleDebit: intituleCompteCharge(d.compte),
        compteCredit: treso.code,
        intituleCredit: treso.intitule,
        montant: d.montant,
      }
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ---- Balance par compte ----
  const balance = new Map<string, LigneBalance>()
  function imputer(code: string, intitule: string, debit: number, credit: number) {
    const ligne = balance.get(code) ?? { code, intitule, debit: 0, credit: 0 }
    ligne.debit += debit
    ligne.credit += credit
    balance.set(code, ligne)
  }
  for (const r of recettes) {
    const treso = compteTresorerie(r.mode_paiement)
    imputer(treso.code, treso.intitule, r.montant, 0)
    imputer(COMPTE_PRODUITS.code, COMPTE_PRODUITS.intitule, 0, r.montant)
  }
  for (const d of depenses) {
    const treso = compteTresorerie(d.mode_paiement)
    imputer(d.compte, intituleCompteCharge(d.compte), d.montant, 0)
    imputer(treso.code, treso.intitule, 0, d.montant)
  }
  const lignesBalance = [...balance.values()].sort((a, b) => a.code.localeCompare(b.code))
  const totalDebit = lignesBalance.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lignesBalance.reduce((s, l) => s + l.credit, 0)

  // ---- Charges groupées par compte (compte de résultat) ----
  const chargesParCompte = new Map<string, number>()
  for (const d of depenses) {
    chargesParCompte.set(d.compte, (chargesParCompte.get(d.compte) ?? 0) + d.montant)
  }

  // ---- Saisie d'une dépense ----
  async function enregistrerDepense(e: FormEvent) {
    e.preventDefault()
    setErreurForm(null)
    const montantNum = parseInt(montant, 10)
    if (libelle.trim().length < 2) {
      setErreurForm('Entrez le libellé de la dépense.')
      return
    }
    if (Number.isNaN(montantNum) || montantNum <= 0) {
      setErreurForm('Entrez un montant valide.')
      return
    }
    const pressingCible =
      pressingFiltre !== 'tous' ? pressingFiltre : pressings[0]?.id
    if (!pressingCible) return

    setEnregistrement(true)
    const supabase = createClient()
    const { error } = await supabase.from('depenses').insert({
      pressing_id: pressingCible,
      date_depense: dateDepense,
      libelle: libelle.trim(),
      compte,
      montant: montantNum,
      mode_paiement: modeDepense,
      reference: reference.trim() || null,
    })
    if (error) {
      setErreurForm("L'enregistrement de la dépense a échoué. Réessayez.")
    } else {
      setLibelle('')
      setMontant('')
      setReference('')
      await recharger()
    }
    setEnregistrement(false)
  }

  async function supprimerDepense(d: Depense) {
    if (!window.confirm(`Supprimer la dépense « ${d.libelle} » (${formatFCFA(d.montant)}) ?`)) return
    const supabase = createClient()
    await supabase.from('depenses').delete().eq('id', d.id)
    await recharger()
  }

  const pressingSelectionne =
    pressingFiltre !== 'tous'
      ? pressings.find((p) => p.id === pressingFiltre) ?? null
      : pressings.length === 1
        ? pressings[0] ?? null
        : null

  const nomPressing = (id: string): string =>
    pressings.find((p) => p.id === id)?.nom ?? ''

  return (
    <div className="space-y-4 px-4 pt-5 print:px-0 print:pt-0">
      {/* ====== En-tête du document imprimé ====== */}
      <div className="hidden print:block">
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
            <h1 className="text-2xl font-bold text-white">
              {pressingSelectionne ? pressingSelectionne.nom : `Tous les pressings (${pressings.length})`}
            </h1>
            <p className="text-sm text-pressci-light/90">
              Période du {formatDate(new Date(`${dateDebut}T00:00:00`))} au{' '}
              {formatDate(new Date(`${dateFin}T00:00:00`))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide text-pressci-accent">
              États comptables
            </p>
            <p className="text-sm text-white">Référentiel SYSCOHADA</p>
            <p className="text-xs text-pressci-light/80">
              Édité le {formatDate(new Date())} à {formatHeure(new Date())}
            </p>
          </div>
        </div>
        <div className="mb-3 mt-1.5 h-1.5 rounded-full bg-pressci-accent" />
      </div>

      {/* ====== En-tête écran ====== */}
      <header className="print:hidden">
        <h1 className="text-xl font-bold text-pressci-dark lg:text-2xl">Comptabilité</h1>
        <p className="text-sm text-gray-500">
          Référentiel SYSCOHADA — recettes, dépenses, résultat
        </p>
      </header>

      {/* Filtres : pressing + période */}
      <div className="space-y-3 print:hidden lg:flex lg:items-end lg:gap-3 lg:space-y-0">
        {pressings.length > 1 && (
          <select
            value={pressingFiltre}
            onChange={(e) => setPressingFiltre(e.target.value)}
            aria-label="Filtrer par pressing"
            className="w-full rounded-card border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-pressci-primary lg:max-w-xs"
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Du</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Au</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
            />
          </div>
        </div>
      </div>

      {/* Synthèse de la période */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card border border-green-200 bg-green-50 p-3 text-center">
          <p className="text-xs text-green-800 opacity-80">Recettes (706)</p>
          <p className="text-sm font-bold text-green-800 lg:text-base">
            {formatFCFA(totalRecettes)}
          </p>
        </div>
        <div className="rounded-card border border-red-200 bg-red-50 p-3 text-center">
          <p className="text-xs text-red-700 opacity-80">Dépenses (classe 6)</p>
          <p className="text-sm font-bold text-red-700 lg:text-base">
            {formatFCFA(totalDepenses)}
          </p>
        </div>
        <div
          className={`rounded-card border p-3 text-center ${
            resultat >= 0 ? 'border-pressci-accent bg-pressci-light' : 'border-orange-200 bg-orange-50'
          }`}
        >
          <p className={`text-xs opacity-80 ${resultat >= 0 ? 'text-pressci-dark' : 'text-orange-700'}`}>
            Résultat
          </p>
          <p
            className={`text-sm font-bold lg:text-base ${
              resultat >= 0 ? 'text-pressci-dark' : 'text-orange-700'
            }`}
          >
            {resultat >= 0 ? '+' : ''}
            {formatFCFA(resultat)}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto print:hidden">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
              onglet === o.id
                ? 'bg-pressci-primary text-white'
                : 'border border-gray-300 bg-white text-gray-600'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : (
        <>
          {/* ================= JOURNAL ================= */}
          {onglet === 'journal' && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-pressci-primary text-left text-white">
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Pièce</th>
                    <th className="px-3 py-2 font-semibold">Libellé</th>
                    <th className="px-3 py-2 font-semibold">Débit</th>
                    <th className="px-3 py-2 font-semibold">Crédit</th>
                    <th className="px-3 py-2 text-right font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {ecritures.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                        Aucune écriture sur la période.
                      </td>
                    </tr>
                  ) : (
                    ecritures.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          {formatDateCourte(e.date)}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{e.piece}</td>
                        <td className="px-3 py-2">
                          {e.libelle}
                          {pressingFiltre === 'tous' && pressings.length > 1 && (
                            <span className="block text-xs text-gray-400">
                              {nomPressing(
                                e.id.startsWith('R-')
                                  ? recettes.find((r) => `R-${r.id}` === e.id)?.pressing_id ?? ''
                                  : depenses.find((d) => `D-${d.id}` === e.id)?.pressing_id ?? ''
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-semibold">{e.compteDebit}</span>{' '}
                          <span className="text-xs text-gray-500">{e.intituleDebit}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-semibold">{e.compteCredit}</span>{' '}
                          <span className="text-xs text-gray-500">{e.intituleCredit}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                          {formatFCFA(e.montant)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {/* ================= DÉPENSES ================= */}
          {onglet === 'depenses' && (
            <div className="space-y-4">
              {peut('gerer_depenses') && (
                <Card>
                  <h2 className="mb-3 text-sm font-semibold text-gray-700">
                    Nouvelle dépense
                    {pressingFiltre === 'tous' && pressings.length > 1 && (
                      <span className="ml-1 font-normal text-gray-400">
                        — sera imputée à {pressings[0]?.nom} (choisissez un pressing dans le
                        filtre pour cibler un autre)
                      </span>
                    )}
                  </h2>
                  <form onSubmit={(e) => void enregistrerDepense(e)} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Libellé"
                        placeholder="Ex : Facture CIE du mois"
                        value={libelle}
                        onChange={(e) => setLibelle(e.target.value)}
                        required
                      />
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Compte de charge (SYSCOHADA)
                        </label>
                        <select
                          value={compte}
                          onChange={(e) => setCompte(e.target.value)}
                          className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary"
                        >
                          {COMPTES_CHARGES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code} — {c.intitule}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Montant (FCFA)"
                        type="number"
                        min={1}
                        placeholder="Ex : 15 000"
                        value={montant}
                        onChange={(e) => setMontant(e.target.value)}
                        required
                      />
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Réglé par
                        </label>
                        <select
                          value={modeDepense}
                          onChange={(e) => setModeDepense(e.target.value as ModeDepense)}
                          className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary"
                        >
                          {MODES_DEPENSE.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Date"
                        type="date"
                        value={dateDepense}
                        onChange={(e) => setDateDepense(e.target.value)}
                        required
                      />
                      <Input
                        label="Référence pièce (facultatif)"
                        placeholder="N° de facture, reçu…"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
                    </div>
                    {erreurForm && (
                      <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
                        {erreurForm}
                      </p>
                    )}
                    <Button type="submit" pleineLargeur chargement={enregistrement}>
                      Enregistrer la dépense
                    </Button>
                  </form>
                </Card>
              )}

              {/* Liste des dépenses */}
              {depenses.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Aucune dépense sur la période.
                </p>
              ) : (
                <div className="space-y-2">
                  {depenses.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-card border border-gray-200 bg-white p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{d.libelle}</p>
                        <p className="text-xs text-gray-500">
                          {formatDateCourte(`${d.date_depense}T12:00:00`)} · {d.compte}{' '}
                          {intituleCompteCharge(d.compte)}
                          {pressings.length > 1 ? ` · ${nomPressing(d.pressing_id)}` : ''}
                          {d.reference ? ` · Réf ${d.reference}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold text-red-600">
                          -{formatFCFA(d.montant)}
                        </span>
                        {peut('gerer_depenses') && (
                          <button
                            type="button"
                            onClick={() => void supprimerDepense(d)}
                            aria-label="Supprimer la dépense"
                            className="px-1 text-red-400 hover:text-red-600 print:hidden"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= COMPTE DE RÉSULTAT ================= */}
          {onglet === 'resultat' && (
            <Card className="space-y-4">
              <div>
                <h2 className="mb-2 rounded-card bg-pressci-primary px-3 py-2 text-sm font-bold text-white">
                  PRODUITS (classe 7)
                </h2>
                <div className="flex justify-between px-3 py-1.5 text-sm">
                  <span>
                    <span className="font-semibold">{COMPTE_PRODUITS.code}</span>{' '}
                    {COMPTE_PRODUITS.intitule}
                  </span>
                  <span className="font-semibold text-green-700">{formatFCFA(totalRecettes)}</span>
                </div>
              </div>

              <div>
                <h2 className="mb-2 rounded-card bg-pressci-primary px-3 py-2 text-sm font-bold text-white">
                  CHARGES (classe 6)
                </h2>
                {chargesParCompte.size === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-400">Aucune charge sur la période.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {[...chargesParCompte.entries()]
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([code, total]) => (
                        <div key={code} className="flex justify-between px-3 py-1.5 text-sm">
                          <span>
                            <span className="font-semibold">{code}</span>{' '}
                            {intituleCompteCharge(code)}
                          </span>
                          <span className="font-semibold text-red-600">{formatFCFA(total)}</span>
                        </div>
                      ))}
                    <div className="flex justify-between px-3 py-2 text-sm font-bold">
                      <span>Total des charges</span>
                      <span className="text-red-700">{formatFCFA(totalDepenses)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`flex items-center justify-between rounded-card px-4 py-3 ${
                  resultat >= 0 ? 'bg-pressci-light' : 'bg-orange-50'
                }`}
              >
                <span className="font-bold text-gray-800">
                  RÉSULTAT {resultat >= 0 ? '(bénéfice)' : '(perte)'}
                </span>
                <span
                  className={`text-lg font-bold ${
                    resultat >= 0 ? 'text-pressci-dark' : 'text-orange-700'
                  }`}
                >
                  {resultat >= 0 ? '+' : ''}
                  {formatFCFA(resultat)}
                </span>
              </div>

              <p className="text-xs text-gray-400">
                Comptabilité de trésorerie (Système Minimal de Trésorerie du SYSCOHADA) : les
                produits correspondent aux encaissements de la période, les charges aux dépenses
                réglées.
              </p>
            </Card>
          )}

          {/* ================= BALANCE ================= */}
          {onglet === 'balance' && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-pressci-primary text-left text-white">
                    <th className="px-3 py-2 font-semibold">Compte</th>
                    <th className="px-3 py-2 font-semibold">Intitulé</th>
                    <th className="px-3 py-2 text-right font-semibold">Débit</th>
                    <th className="px-3 py-2 text-right font-semibold">Crédit</th>
                    <th className="px-3 py-2 text-right font-semibold">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {lignesBalance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                        Aucun mouvement sur la période.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {lignesBalance.map((l) => {
                        const solde = l.debit - l.credit
                        return (
                          <tr key={l.code} className="border-b border-gray-100">
                            <td className="px-3 py-2 font-semibold">{l.code}</td>
                            <td className="px-3 py-2">{l.intitule}</td>
                            <td className="px-3 py-2 text-right">{formatFCFA(l.debit)}</td>
                            <td className="px-3 py-2 text-right">{formatFCFA(l.credit)}</td>
                            <td
                              className={`px-3 py-2 text-right font-semibold ${
                                solde >= 0 ? 'text-gray-800' : 'text-red-600'
                              }`}
                            >
                              {formatFCFA(Math.abs(solde))} {solde >= 0 ? 'D' : 'C'}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-pressci-light font-bold">
                        <td className="px-3 py-2" colSpan={2}>
                          TOTAUX
                        </td>
                        <td className="px-3 py-2 text-right">{formatFCFA(totalDebit)}</td>
                        <td className="px-3 py-2 text-right">{formatFCFA(totalCredit)}</td>
                        <td className="px-3 py-2 text-right">—</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </Card>
          )}

          <div className="print:hidden">
            <Button pleineLargeur variante="outline" onClick={() => window.print()}>
              🖨️ Imprimer / PDF ({ONGLETS.find((o) => o.id === onglet)?.label})
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
