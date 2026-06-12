import Card from '@/components/ui/Card'
import { formatFCFA } from '@/lib/utils'
import type { DashboardStats } from '@/types'

interface KpiGridProps {
  stats: DashboardStats
}

interface Kpi {
  label: string
  valeur: string
  tinte: string
  icone: React.ReactNode
}

const ICONE = 'h-5 w-5'

export default function KpiGrid({ stats }: KpiGridProps) {
  const kpis: Kpi[] = [
    {
      label: 'Tickets actifs',
      valeur: String(stats.tickets_actifs),
      tinte: 'bg-violet-100 text-violet-600',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      label: 'Prêts à récupérer',
      valeur: String(stats.tickets_prets),
      tinte: 'bg-green-100 text-green-600',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'CA du mois',
      valeur: formatFCFA(stats.ca_mois),
      tinte: 'bg-pressci-light text-pressci-primary',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: 'Créances totales',
      valeur: formatFCFA(stats.creances_total),
      tinte: 'bg-orange-100 text-orange-600',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpi.tinte}`}
          >
            {kpi.icone}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-gray-500">{kpi.label}</p>
            <p className="truncate text-lg font-bold leading-tight text-gray-900">{kpi.valeur}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
