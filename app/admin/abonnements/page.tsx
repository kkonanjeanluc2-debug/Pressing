'use client'

import Card from '@/components/ui/Card'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { formatDateCourte, formatFCFA } from '@/lib/utils'
import type { AbonnementAdmin } from '@/types'

const BADGE_PLAN: Record<string, string> = {
  gratuit: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-700',
  reseau: 'bg-violet-100 text-violet-700',
}

const BADGE_STATUT: Record<string, string> = {
  actif: 'bg-green-100 text-green-700',
  expire: 'bg-gray-100 text-gray-500',
  suspendu: 'bg-red-100 text-red-700',
}

export default function AdminAbonnementsPage() {
  const { donnees, chargement, erreur } = useDonneesCachees<AbonnementAdmin[]>(
    'admin_abonnements',
    async () => {
      const res = await fetch('/api/admin/abonnements')
      const data = (await res.json()) as { succes: boolean; abonnements?: AbonnementAdmin[] }
      if (!data.succes || !data.abonnements) throw new Error('refus')
      return data.abonnements
    },
    'Impossible de charger les abonnements.'
  )

  const abonnements = donnees ?? []
  const revenus = abonnements.reduce((s, a) => s + (a.montant ?? 0), 0)

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Abonnements</h1>
        <p className="text-sm text-gray-500">
          {abonnements.length} abonnement{abonnements.length > 1 ? 's' : ''} · revenus encaissés :{' '}
          <span className="font-semibold text-gray-700">{formatFCFA(revenus)}</span>
        </p>
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
                <th className="px-4 py-3 font-semibold">Propriétaire</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Montant</th>
                <th className="px-4 py-3 font-semibold">Début</th>
                <th className="px-4 py-3 font-semibold">Fin</th>
              </tr>
            </thead>
            <tbody>
              {abonnements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Aucun abonnement.
                  </td>
                </tr>
              ) : (
                abonnements.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-800">{a.proprietaire}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_PLAN[a.plan] ?? BADGE_PLAN.gratuit}`}
                      >
                        {a.plan === 'pro' ? 'Pro' : a.plan === 'reseau' ? 'Réseau' : 'Gratuit'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_STATUT[a.statut] ?? BADGE_STATUT.expire}`}
                      >
                        {a.statut === 'actif' ? 'Actif' : a.statut === 'suspendu' ? 'Suspendu' : 'Expiré'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {a.montant !== null ? formatFCFA(a.montant) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.date_debut ? formatDateCourte(a.date_debut) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.date_fin ? formatDateCourte(a.date_fin) : '—'}
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
