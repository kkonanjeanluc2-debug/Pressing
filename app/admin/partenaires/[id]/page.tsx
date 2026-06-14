'use client'

import Card from '@/components/ui/Card'
import { formatDateCourte, formatFCFA } from '@/lib/utils'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { DetailPartenaire, ModePaiementVersement, VersementLigne } from '@/app/api/admin/partenaires/[id]/route'

const MODES_PAIEMENT: { value: ModePaiementVersement; label: string; icon: string }[] = [
  { value: 'wave',         label: 'Wave',         icon: '🌊' },
  { value: 'orange_money', label: 'Orange Money',  icon: '🟠' },
  { value: 'mtn_money',   label: 'MTN Money',     icon: '🟡' },
  { value: 'moov_money',  label: 'Moov Money',    icon: '🔵' },
  { value: 'virement bancaire', label: 'Virement bancaire', icon: '🏦' },
  { value: 'cash',        label: 'Espèces',        icon: '💵' },
]

const LABEL_MODE: Record<ModePaiementVersement, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_money: 'MTN Money',
  moov_money: 'Moov Money',
  'virement bancaire': 'Virement bancaire',
  cash: 'Espèces',
}
import type { InscritPartenaire } from '@/app/api/partenaire/inscrits/route'

const BADGE_PLAN: Record<string, string> = {
  gratuit: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-700',
  business: 'bg-orange-100 text-orange-700',
  reseau: 'bg-violet-100 text-violet-700',
}

const LABEL_PLAN: Record<string, string> = {
  gratuit: 'Gratuit',
  pro: 'Pro',
  business: 'Business',
  reseau: 'Réseau',
}

function formatDateHeure(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPartenaireDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const [detail, setDetail] = useState<DetailPartenaire | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  /* ── Modale versement ── */
  const [modaleVersement, setModaleVersement] = useState(false)
  const [montant, setMontant] = useState('')
  const [modePaiement, setModePaiement] = useState<ModePaiementVersement>('wave')
  const [versePar, setVersePar] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [versementEnCours, setVersementEnCours] = useState(false)
  const [versementErreur, setVersementErreur] = useState<string | null>(null)

  useEffect(() => { void charger() }, [id])

  async function charger() {
    setChargement(true)
    setErreur(null)
    const res = await fetch(`/api/admin/partenaires/${id}`)
    const data = (await res.json()) as { succes: boolean; detail?: DetailPartenaire; erreur?: string }
    if (!data.succes || !data.detail) {
      setErreur(data.erreur ?? 'Impossible de charger les données.')
    } else {
      setDetail(data.detail)
    }
    setChargement(false)
  }

  function ouvrirModale() {
    setMontant('')
    setModePaiement('wave')
    setVersePar('')
    setCommentaire('')
    setVersementErreur(null)
    setModaleVersement(true)
  }

  async function enregistrerVersement() {
    const m = Number(montant)
    if (!m || m <= 0) {
      setVersementErreur('Saisissez un montant valide.')
      return
    }
    if (!versePar.trim()) {
      setVersementErreur('Saisissez le nom du verseur.')
      return
    }
    setVersementEnCours(true)
    setVersementErreur(null)
    const res = await fetch(`/api/admin/partenaires/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montant: m, mode_paiement: modePaiement, verse_par: versePar, commentaire }),
    })
    const data = (await res.json()) as { succes: boolean; erreur?: string }
    if (!data.succes) {
      setVersementErreur(data.erreur ?? 'Erreur lors de l\'enregistrement.')
      setVersementEnCours(false)
      return
    }
    setModaleVersement(false)
    setVersementEnCours(false)
    void charger()
  }

  if (chargement) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (erreur || !detail) {
    return (
      <div className="space-y-4">
        <Link href="/admin/partenaires" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux partenaires
        </Link>
        <div className="rounded-2xl bg-red-50 px-4 py-8 text-center">
          <p className="text-red-700">{erreur ?? 'Partenaire introuvable.'}</p>
        </div>
      </div>
    )
  }

  const { partenaire, inscrits, commissions, versements } = detail

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Link
          href="/admin/partenaires"
          className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux partenaires
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl font-bold text-amber-700">
              {partenaire.nom.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  {partenaire.type_compte === 'entreprise' ? '🏢 ' : '👤 '}{partenaire.nom}
                </h1>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${partenaire.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {partenaire.statut === 'actif' ? 'Actif' : 'Suspendu'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {partenaire.email}
                {partenaire.telephone ? ` · ${partenaire.telephone}` : ''}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-pressci-primary">
                  {partenaire.code_parrainage}
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                  {partenaire.taux_commission}% commission
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={ouvrirModale}
            className="rounded-full bg-pressci-primary px-4 py-2 text-sm font-bold text-white hover:bg-pressci-dark"
          >
            + Enregistrer un versement
          </button>
        </div>
      </div>

      {/* KPIs commissions */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="space-y-1 p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-gray-900">{inscrits.length}</p>
          <p className="text-xs text-gray-500">Inscrits via ce code</p>
        </Card>

        <Card className="space-y-1 p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatFCFA(commissions.ca_total)}</p>
          <p className="text-xs text-gray-500">CA total généré</p>
        </Card>

        <Card className="space-y-1 p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatFCFA(commissions.commission_estimee)}</p>
          <p className="text-xs text-gray-500">Commission totale ({partenaire.taux_commission}%)</p>
        </Card>

        <Card className={`space-y-1 p-5 ${commissions.a_verser > 0 ? 'border border-orange-200 bg-orange-50' : ''}`}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${commissions.a_verser > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-xl font-bold ${commissions.a_verser > 0 ? 'text-orange-700' : 'text-green-700'}`}>
              {formatFCFA(commissions.a_verser)}
            </p>
            {commissions.deja_verse > 0 && (
              <span className="text-xs text-gray-400">/{formatFCFA(commissions.deja_verse)} versé</span>
            )}
          </div>
          <p className="text-xs text-gray-500">Restant à verser</p>
        </Card>
      </div>

      {/* Tableau des inscrits */}
      <Card className="p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold text-gray-900">Utilisateurs inscrits</h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {inscrits.length}
          </span>
        </div>
        {inscrits.length === 0 ? (
          <div className="border-t border-gray-100 py-12 text-center">
            <p className="text-3xl">👥</p>
            <p className="mt-3 text-sm font-semibold text-gray-500">
              Aucun utilisateur inscrit avec ce code.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-semibold">Utilisateur</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Inscrit le</th>
                  <th className="px-5 py-3 text-right font-semibold">CA généré</th>
                  <th className="px-5 py-3 text-right font-semibold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {(inscrits as InscritPartenaire[]).map((u) => {
                  const commU = Math.round(u.montant_total * (partenaire.taux_commission / 100))
                  return (
                    <tr key={u.user_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{u.nom}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_PLAN[u.plan] ?? BADGE_PLAN.gratuit}`}>
                          {LABEL_PLAN[u.plan] ?? u.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatDateCourte(u.created_at)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">
                        {formatFCFA(u.montant_total)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-green-700">
                        {commU > 0 ? `+${formatFCFA(commU)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-5 py-3 text-sm font-bold text-gray-700">
                    Total
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">
                    {formatFCFA(commissions.ca_total)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-green-700">
                    +{formatFCFA(commissions.commission_estimee)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Historique des versements */}
      <Card className="p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold text-gray-900">Historique des versements</h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {versements.length}
          </span>
        </div>
        {versements.length === 0 ? (
          <div className="border-t border-gray-100 py-10 text-center">
            <p className="text-3xl">💸</p>
            <p className="mt-3 text-sm font-semibold text-gray-500">Aucun versement enregistré.</p>
            {commissions.a_verser > 0 && (
              <button
                type="button"
                onClick={ouvrirModale}
                className="mt-3 rounded-full bg-pressci-primary px-4 py-2 text-sm font-bold text-white"
              >
                Enregistrer le premier versement
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Montant</th>
                  <th className="px-5 py-3 font-semibold">Mode</th>
                  <th className="px-5 py-3 font-semibold">Versé par</th>
                  <th className="px-5 py-3 font-semibold">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {(versements as VersementLigne[]).map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-500">{formatDateHeure(v.created_at)}</td>
                    <td className="px-5 py-3 text-right font-bold text-green-700">
                      {formatFCFA(v.montant)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {LABEL_MODE[v.mode_paiement] ?? v.mode_paiement}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-700">{v.verse_par}</td>
                    <td className="px-5 py-3 text-gray-500">{v.commentaire ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="px-5 py-3 text-sm font-bold text-gray-700">Total versé</td>
                  <td className="px-5 py-3 text-right font-bold text-green-700">
                    {formatFCFA(commissions.deja_verse)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* ════ Modale versement ════ */}
      {modaleVersement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Enregistrer un versement</h2>
            <p className="mb-4 text-sm text-gray-500">{partenaire.nom}</p>

            {commissions.a_verser > 0 && (
              <div className="mb-4 rounded-xl bg-orange-50 px-4 py-3 text-sm">
                <p className="text-xs text-gray-500">Commission restante à verser</p>
                <p className="text-lg font-bold text-orange-700">{formatFCFA(commissions.a_verser)}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Montant versé (FCFA) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder={commissions.a_verser > 0 ? String(commissions.a_verser) : '0'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                />
                {commissions.a_verser > 0 && (
                  <button
                    type="button"
                    onClick={() => setMontant(String(commissions.a_verser))}
                    className="mt-1 text-xs text-pressci-primary hover:underline"
                  >
                    Remplir avec le montant restant ({formatFCFA(commissions.a_verser)})
                  </button>
                )}
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-700">
                  Mode de paiement *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MODES_PAIEMENT.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setModePaiement(m.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-semibold transition-all ${modePaiement === m.value ? 'border-pressci-primary bg-pressci-light text-pressci-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="leading-tight text-center">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Votre nom (verseur) *
                </label>
                <input
                  type="text"
                  value={versePar}
                  onChange={(e) => setVersePar(e.target.value)}
                  placeholder="Prénom NOM"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={2}
                  placeholder="Ex : Virement Wave janvier 2025"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                />
              </div>
            </div>

            {versementErreur && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{versementErreur}</p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void enregistrerVersement()}
                disabled={versementEnCours}
                className="flex-1 rounded-full bg-pressci-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {versementEnCours ? 'Enregistrement…' : 'Confirmer le versement'}
              </button>
              <button
                type="button"
                onClick={() => setModaleVersement(false)}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
