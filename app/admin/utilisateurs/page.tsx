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

export default function AdminUtilisateursPage() {
  const [recherche, setRecherche] = useState('')

  const { donnees, chargement, erreur } = useDonneesCachees<UtilisateurAdmin[]>(
    'admin_utilisateurs',
    async () => {
      const res = await fetch('/api/admin/utilisateurs')
      const data = (await res.json()) as { succes: boolean; utilisateurs?: UtilisateurAdmin[] }
      if (!data.succes || !data.utilisateurs) throw new Error('refus')
      return data.utilisateurs
    },
    'Impossible de charger les utilisateurs.'
  )

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
              </tr>
            </thead>
            <tbody>
              {filtres.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filtres.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-100">
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
                    <td className="px-4 py-3 text-gray-500">
                      {formatDateCourte(u.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
