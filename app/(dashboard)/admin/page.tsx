'use client'

import Card from '@/components/ui/Card'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'
import { formatDateCourte, formatFCFA } from '@/lib/utils'
import type { StatsAdmin } from '@/app/api/admin/stats/route'

interface Tuile {
  label: string
  valeur: string
  detail?: string
  couleur: string
}

export default function AdminPage() {
  const { estAdmin, chargement: chargementAdmin } = useSuperAdmin()

  const { donnees, chargement, erreur } = useDonneesCachees<StatsAdmin>(
    estAdmin ? 'admin_stats' : null,
    async () => {
      const res = await fetch('/api/admin/stats')
      const data = (await res.json()) as { succes: boolean; stats?: StatsAdmin }
      if (!data.succes || !data.stats) throw new Error('refus')
      return data.stats
    },
    'Impossible de charger les statistiques de la plateforme.'
  )

  if (!chargementAdmin && !estAdmin) {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🛡️</p>
        <p className="font-semibold">Espace réservé à l'administrateur de la plateforme.</p>
      </div>
    )
  }

  if (chargement || !donnees) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  const s = donnees
  const tuiles: Tuile[] = [
    {
      label: 'Comptes',
      valeur: String(s.comptes.total),
      detail: `${s.comptes.entreprises} entreprise${s.comptes.entreprises > 1 ? 's' : ''} · ${s.comptes.personnes} particulier${s.comptes.personnes > 1 ? 's' : ''}`,
      couleur: 'bg-blue-500',
    },
    {
      label: 'Pressings',
      valeur: String(s.pressings.total),
      detail: `${s.pressings.ouverts} ouvert${s.pressings.ouverts > 1 ? 's' : ''} en ce moment`,
      couleur: 'bg-pressci-primary',
    },
    {
      label: 'Agents',
      valeur: String(s.agents.total),
      detail: `${s.agents.actifs} actif${s.agents.actifs > 1 ? 's' : ''}`,
      couleur: 'bg-violet-600',
    },
    {
      label: 'Tickets (total)',
      valeur: s.tickets.total.toLocaleString('fr-FR'),
      detail: `${s.tickets.mois.toLocaleString('fr-FR')} ce mois`,
      couleur: 'bg-orange-500',
    },
    {
      label: 'Volume encaissé ce mois',
      valeur: formatFCFA(s.volume_mois),
      detail: 'Tous pressings confondus',
      couleur: 'bg-emerald-500',
    },
    {
      label: 'MRR abonnements',
      valeur: formatFCFA(s.abonnements.mrr),
      detail: `${s.abonnements.pro + s.abonnements.reseau} abonnement${s.abonnements.pro + s.abonnements.reseau > 1 ? 's' : ''} payant${s.abonnements.pro + s.abonnements.reseau > 1 ? 's' : ''}`,
      couleur: 'bg-amber-500',
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 pt-5">
      <header>
        <h1 className="text-xl font-bold text-pressci-dark lg:text-2xl">
          🛡️ Administration PressCI
        </h1>
        <p className="text-sm text-gray-500">Vue d'ensemble de toute la plateforme</p>
      </header>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* Tuiles principales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {tuiles.map((t) => (
          <div key={t.label} className={`rounded-card p-4 text-white ${t.couleur}`}>
            <p className="text-xl font-bold leading-tight">{t.valeur}</p>
            <p className="mt-0.5 text-xs font-medium opacity-90">{t.label}</p>
            {t.detail && <p className="mt-1 text-[11px] opacity-75">{t.detail}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Abonnements */}
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Abonnements actifs</h2>
          {(
            [
              { plan: 'Gratuit', nb: s.abonnements.gratuit, prix: 0 },
              { plan: 'Pro', nb: s.abonnements.pro, prix: 5000 },
              { plan: 'Réseau', nb: s.abonnements.reseau, prix: 12000 },
            ] as const
          ).map((l) => (
            <div
              key={l.plan}
              className="flex items-center justify-between rounded-card bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-700">{l.plan}</span>
              <span>
                <span className="font-bold text-pressci-dark">{l.nb}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {l.prix > 0 ? `${formatFCFA(l.nb * l.prix)}/mois` : '—'}
                </span>
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-card bg-pressci-light px-3 py-2 text-sm font-bold text-pressci-dark">
            <span>Revenus abonnements (historique)</span>
            <span>{formatFCFA(s.abonnements.revenus_total)}</span>
          </div>
        </Card>

        {/* Derniers comptes */}
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Derniers comptes créés</h2>
          {s.derniers_comptes.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Aucun compte.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {s.derniers_comptes.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-gray-800">
                    {c.type_compte === 'entreprise' ? '🏢' : '👤'} {c.nom}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateCourte(c.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="text-xs text-gray-400">
        Données calculées en direct sur l'ensemble de la plateforme — visibles uniquement par les
        super administrateurs.
      </p>
    </div>
  )
}
