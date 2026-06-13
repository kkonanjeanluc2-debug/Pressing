'use client'

import Card from '@/components/ui/Card'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { formatDateCourte } from '@/lib/utils'
import type { UtilisateurAdmin } from '@/types'
import { useState } from 'react'

const BADGE_PLAN: Record<string, string> = {
  gratuit: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-700',
  reseau: 'bg-violet-100 text-violet-700',
}

const PLANS_OPTIONS = [
  { id: 'gratuit', label: 'Gratuit', couleur: 'border-gray-300 text-gray-700' },
  { id: 'pro', label: 'Pro', couleur: 'border-blue-400 text-blue-700' },
  { id: 'reseau', label: 'Réseau', couleur: 'border-violet-400 text-violet-700' },
] as const

type PlanId = 'gratuit' | 'pro' | 'reseau'

const DUREES_RAPIDES = [
  { label: '7 jours', jours: 7 },
  { label: '30 jours', jours: 30 },
  { label: '3 mois', jours: 90 },
  { label: '1 an', jours: 365 },
]

export default function AdminUtilisateursPage() {
  const [recherche, setRecherche] = useState('')

  const { donnees, chargement, erreur, recharger } = useDonneesCachees<UtilisateurAdmin[]>(
    'admin_utilisateurs',
    async () => {
      const res = await fetch('/api/admin/utilisateurs')
      const data = (await res.json()) as { succes: boolean; utilisateurs?: UtilisateurAdmin[] }
      if (!data.succes || !data.utilisateurs) throw new Error('refus')
      return data.utilisateurs
    },
    'Impossible de charger les utilisateurs.'
  )

  /* ── Abonnement manuel ── */
  const [modaleAbo, setModaleAbo] = useState<UtilisateurAdmin | null>(null)
  const [planChoisi, setPlanChoisi] = useState<PlanId>('pro')
  const [jours, setJours] = useState(30)
  const [aboEnCours, setAboEnCours] = useState(false)
  const [aboMessage, setAboMessage] = useState<string | null>(null)
  const [aboErreur, setAboErreur] = useState<string | null>(null)

  async function attribuerAbonnement() {
    if (!modaleAbo) return
    setAboEnCours(true)
    setAboErreur(null)
    const res = await fetch('/api/admin/abonnement-manuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: modaleAbo.user_id, plan: planChoisi, jours }),
    })
    const data = (await res.json()) as { succes: boolean; erreur?: string }
    if (data.succes) {
      setAboMessage(`✅ Abonnement ${planChoisi} de ${jours} jours attribué à ${modaleAbo.nom}.`)
      setModaleAbo(null)
      void recharger()
    } else {
      setAboErreur(data.erreur ?? 'Erreur inconnue.')
    }
    setAboEnCours(false)
  }

  /* ── Reset mot de passe ── */
  const [modaleReset, setModaleReset] = useState<UtilisateurAdmin | null>(null)
  const [lienReset, setLienReset] = useState<string | null>(null)
  const [resetEnCours, setResetEnCours] = useState(false)
  const [resetErreur, setResetErreur] = useState<string | null>(null)
  const [copie, setCopie] = useState(false)

  async function genererLienReset(user: UtilisateurAdmin) {
    setModaleReset(user)
    setLienReset(null)
    setResetErreur(null)
    setCopie(false)
    setResetEnCours(true)
    const res = await fetch('/api/admin/reset-mdp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
    const data = (await res.json()) as { succes: boolean; lien?: string; erreur?: string }
    if (data.succes) {
      setLienReset(data.lien ?? null)
    } else {
      setResetErreur(data.erreur ?? 'Erreur inconnue.')
    }
    setResetEnCours(false)
  }

  async function copierLien() {
    if (!lienReset) return
    await navigator.clipboard.writeText(lienReset)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  /* ── Filtre ── */
  const utilisateurs = donnees ?? []
  const rechercheNorm = recherche.trim().toLowerCase()
  const filtres = rechercheNorm
    ? utilisateurs.filter(
        (u) =>
          u.nom.toLowerCase().includes(rechercheNorm) ||
          u.email.toLowerCase().includes(rechercheNorm) ||
          (u.telephone ?? '').includes(rechercheNorm)
      )
    : utilisateurs

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500">
            {utilisateurs.length} compte{utilisateurs.length > 1 ? 's' : ''} propriétaire
            {utilisateurs.length > 1 ? 's' : ''}
          </p>
        </div>
        <input
          type="search"
          placeholder="Rechercher…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-48 rounded-card border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-pressci-primary lg:w-64"
        />
      </header>

      {aboMessage && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">{aboMessage}</p>
      )}
      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-semibold">Compte</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 text-center font-semibold">Pressings</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Inscrit le</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtres.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filtres.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pressci-light text-sm font-bold text-pressci-primary">
                          {u.nom.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {u.type_compte === 'entreprise' ? '🏢 ' : ''}
                            {u.nom}
                          </p>
                          <p className="text-xs text-gray-400">
                            {u.type_compte === 'entreprise' ? 'Entreprise' : 'Personne physique'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{u.email}</p>
                      <p className="text-xs text-gray-400">{u.telephone ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800">
                      {u.nb_pressings}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_PLAN[u.plan] ?? BADGE_PLAN.gratuit}`}
                      >
                        {u.plan === 'pro' ? 'Pro' : u.plan === 'reseau' ? 'Réseau' : 'Gratuit'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateCourte(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAboMessage(null)
                            setAboErreur(null)
                            setPlanChoisi('pro')
                            setJours(30)
                            setModaleAbo(u)
                          }}
                          title="Attribuer un abonnement"
                          className="flex items-center gap-1 rounded-lg bg-pressci-light px-2.5 py-1.5 text-xs font-semibold text-pressci-primary transition-colors hover:bg-pressci-primary hover:text-white"
                        >
                          🎁 Abonnement
                        </button>
                        <button
                          type="button"
                          onClick={() => void genererLienReset(u)}
                          title="Réinitialiser le mot de passe"
                          className="flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-500 hover:text-white"
                        >
                          🔑 Reset MDP
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ════ Modale : attribution d'abonnement ════ */}
      {modaleAbo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Attribuer un abonnement</h2>
            <p className="mb-5 text-sm text-gray-500">
              Bénéficiaire :{' '}
              <strong className="text-gray-800">
                {modaleAbo.nom} ({modaleAbo.email})
              </strong>
            </p>

            {/* Choix du plan */}
            <p className="mb-2 text-sm font-medium text-gray-700">Forfait</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {PLANS_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanChoisi(p.id)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                    planChoisi === p.id
                      ? `${p.couleur} bg-opacity-10 scale-[1.03] shadow-sm`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Durée */}
            <p className="mb-2 text-sm font-medium text-gray-700">Durée</p>
            <div className="mb-3 grid grid-cols-4 gap-2">
              {DUREES_RAPIDES.map((d) => (
                <button
                  key={d.jours}
                  type="button"
                  onClick={() => setJours(d.jours)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${
                    jours === d.jours
                      ? 'border-pressci-primary bg-pressci-light text-pressci-primary'
                      : 'border-gray-200 text-gray-500 hover:border-pressci-primary'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="mb-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={3650}
                value={jours}
                onChange={(e) => setJours(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
              />
              <span className="text-sm text-gray-500">jours</span>
              <span className="text-xs text-gray-400">
                — expire le{' '}
                {new Date(Date.now() + jours * 86400_000).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            {aboErreur && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {aboErreur}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void attribuerAbonnement()}
                disabled={aboEnCours}
                className="flex-1 rounded-full bg-pressci-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {aboEnCours ? 'Attribution…' : 'Confirmer'}
              </button>
              <button
                type="button"
                onClick={() => setModaleAbo(null)}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Modale : reset mot de passe ════ */}
      {modaleReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Réinitialiser le mot de passe</h2>
            <p className="mb-5 text-sm text-gray-500">
              Utilisateur :{' '}
              <strong className="text-gray-800">
                {modaleReset.nom} ({modaleReset.email})
              </strong>
            </p>

            {resetEnCours && (
              <div className="flex justify-center py-4">
                <span className="spinner spinner-dark h-7 w-7" />
              </div>
            )}

            {resetErreur && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{resetErreur}</p>
            )}

            {lienReset && !resetEnCours && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Lien de réinitialisation généré. Partagez-le avec l'utilisateur — il expire sous
                  peu (24 h).
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-600">
                    {lienReset}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copierLien()}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      copie
                        ? 'bg-green-100 text-green-700'
                        : 'bg-pressci-primary text-white hover:bg-pressci-dark'
                    }`}
                  >
                    {copie ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
                <a
                  href={`mailto:${modaleReset.email}?subject=Réinitialisation de votre mot de passe Pressing Ivoire&body=Bonjour ${modaleReset.nom},%0A%0AVoici votre lien de réinitialisation de mot de passe :%0A${encodeURIComponent(lienReset)}%0A%0ACe lien expire dans 24 heures.%0A%0ACordialement`}
                  className="block text-center text-xs font-semibold text-pressci-primary hover:underline"
                >
                  📧 Envoyer par e-mail à {modaleReset.email}
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setModaleReset(null); setLienReset(null) }}
              className="mt-5 w-full rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
