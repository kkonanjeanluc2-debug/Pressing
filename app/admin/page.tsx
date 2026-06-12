'use client'

import Card from '@/components/ui/Card'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { formatDateCourte, formatFCFA } from '@/lib/utils'
import type { StatsAdmin } from '@/types'
import Link from 'next/link'

const PLANS_BARRES = [
  { id: 'gratuit', label: 'Gratuit', point: 'bg-gray-400', barre: 'bg-gray-400' },
  { id: 'pro', label: 'Pro', point: 'bg-blue-500', barre: 'bg-blue-500' },
  { id: 'reseau', label: 'Réseau', point: 'bg-violet-500', barre: 'bg-violet-500' },
] as const

const BADGE_PLAN: Record<string, string> = {
  gratuit: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-700',
  reseau: 'bg-violet-100 text-violet-700',
}

function NomPlan({ plan }: { plan: string }) {
  const label = plan === 'pro' ? 'Pro' : plan === 'reseau' ? 'Réseau' : 'Gratuit'
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_PLAN[plan] ?? BADGE_PLAN.gratuit}`}
    >
      {label}
    </span>
  )
}

export default function AdminDashboardPage() {
  const { donnees: s, chargement, erreur } = useDonneesCachees<StatsAdmin>(
    'admin_stats',
    async () => {
      const res = await fetch('/api/admin/stats')
      const data = (await res.json()) as { succes: boolean; stats?: StatsAdmin }
      if (!data.succes || !data.stats) throw new Error('refus')
      return data.stats
    },
    'Impossible de charger les statistiques de la plateforme.'
  )

  if (chargement || !s) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  const totalAbonnements = s.abonnements.gratuit + s.abonnements.pro + s.abonnements.reseau
  const pourcent = (n: number) =>
    totalAbonnements > 0 ? Math.round((n / totalAbonnements) * 100) : 0
  const compteurs: Record<string, number> = {
    gratuit: s.abonnements.gratuit,
    pro: s.abonnements.pro,
    reseau: s.abonnements.reseau,
  }

  const tuiles = [
    {
      label: 'Propriétaires inscrits',
      valeur: String(s.comptes.total),
      tinte: 'bg-blue-100 text-blue-600',
      icone: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
        </svg>
      ),
    },
    {
      label: 'Pressings',
      valeur: String(s.pressings.total),
      tinte: 'bg-green-100 text-green-600',
      icone: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M9 21v-6h6v6" />
        </svg>
      ),
    },
    {
      label: 'Tickets (total)',
      valeur: s.tickets.total.toLocaleString('fr-FR'),
      tinte: 'bg-amber-100 text-amber-600',
      icone: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4" />
        </svg>
      ),
    },
    {
      label: 'Volume ce mois (FCFA)',
      valeur: s.volume_mois.toLocaleString('fr-FR'),
      tinte: 'bg-violet-100 text-violet-600',
      icone: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* ---- Tuiles KPI ---- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tuiles.map((t) => (
          <Card key={t.label} className="space-y-3 p-5">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.tinte}`}
            >
              {t.icone}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{t.valeur}</p>
              <p className="text-sm text-gray-500">{t.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- Répartition par plan ---- */}
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Répartition par plan</h2>
            <p className="text-sm text-gray-500">
              Revenu mensuel estimé :{' '}
              <span className="font-bold text-gray-800">{formatFCFA(s.abonnements.mrr)}</span>
            </p>
          </div>

          {PLANS_BARRES.map((p) => {
            const nb = compteurs[p.id] ?? 0
            const pc = pourcent(nb)
            return (
              <div key={p.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-700">
                    <span className={`h-2 w-2 rounded-full ${p.point}`} />
                    {p.label}
                  </span>
                  <span className="text-gray-500">
                    {nb} · {pc}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-1.5 rounded-full ${p.barre}`}
                    style={{ width: `${pc}%` }}
                  />
                </div>
              </div>
            )
          })}

          <p className="text-xs text-gray-400">
            Revenus abonnements encaissés (historique) :{' '}
            {formatFCFA(s.abonnements.revenus_total)}
          </p>
        </Card>

        {/* ---- Derniers inscrits ---- */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Derniers inscrits</h2>
            <Link
              href="/admin/utilisateurs"
              className="text-sm font-semibold text-pressci-primary"
            >
              Voir tous →
            </Link>
          </div>
          {s.derniers_comptes.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Aucun compte.</p>
          ) : (
            <div className="space-y-3">
              {s.derniers_comptes.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pressci-light text-sm font-bold text-pressci-primary">
                      {c.nom.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {c.type_compte === 'entreprise' ? '🏢 ' : ''}
                        {c.nom}
                      </p>
                      <p className="text-xs text-gray-400">{formatDateCourte(c.created_at)}</p>
                    </div>
                  </div>
                  <NomPlan plan={c.plan} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
