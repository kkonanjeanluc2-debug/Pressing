'use client'

import Card from '@/components/ui/Card'
import { formatFCFA } from '@/lib/utils'
import type { SemaineCA } from '@/types'

interface RevenueChartProps {
  donnees: SemaineCA[]
}

/** Mini graphique en barres : CA des 4 dernières semaines. */
export default function RevenueChart({ donnees }: RevenueChartProps) {
  const max = Math.max(...donnees.map((d) => d.montant), 1)

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">CA des 4 dernières semaines</h2>
      <div className="flex h-32 items-end justify-between gap-3">
        {donnees.map((d) => {
          const hauteur = Math.max(4, Math.round((d.montant / max) * 100))
          return (
            <div key={d.semaine} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-gray-600">
                {d.montant > 0 ? formatFCFA(d.montant).replace(' FCFA', '') : '0'}
              </span>
              <div
                className="w-full rounded-t-md bg-pressci-secondary"
                style={{ height: `${hauteur}%` }}
              />
              <span className="text-[10px] text-gray-400">{d.semaine}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
