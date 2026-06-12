'use client'

import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { formatDateCourte, formatFCFA, formatHeure, MODE_PAIEMENT_LABELS } from '@/lib/utils'
import type { ActiviteAdmin, ModePaiement, StatutTicket } from '@/types'

export default function AdminActivitePage() {
  const { donnees, chargement, erreur } = useDonneesCachees<ActiviteAdmin>(
    'admin_activite',
    async () => {
      const res = await fetch('/api/admin/activite')
      const data = (await res.json()) as { succes: boolean; activite?: ActiviteAdmin }
      if (!data.succes || !data.activite) throw new Error('refus')
      return data.activite
    },
    "Impossible de charger l'activité de la plateforme."
  )

  if (chargement || !donnees) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Activité globale</h1>
        <p className="text-sm text-gray-500">Derniers événements sur toute la plateforme</p>
      </header>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- Derniers tickets ---- */}
        <Card className="p-5">
          <h2 className="mb-3 text-base font-bold text-gray-900">Derniers dépôts</h2>
          {donnees.tickets.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Aucun ticket.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {donnees.tickets.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {t.numero} · {t.pressing}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDateCourte(t.created_at)} à {formatHeure(t.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {formatFCFA(t.montant_total)}
                    </span>
                    <Badge statut={t.statut as StatutTicket} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ---- Derniers encaissements ---- */}
        <Card className="p-5">
          <h2 className="mb-3 text-base font-bold text-gray-900">Derniers encaissements</h2>
          {donnees.encaissements.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Aucun encaissement.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {donnees.encaissements.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{e.pressing}</p>
                    <p className="text-xs text-gray-400">
                      {formatDateCourte(e.created_at)} à {formatHeure(e.created_at)} ·{' '}
                      {MODE_PAIEMENT_LABELS[e.mode_paiement as ModePaiement] ?? e.mode_paiement}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-green-700">
                    +{formatFCFA(e.montant)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
