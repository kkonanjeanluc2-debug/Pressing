import Card from '@/components/ui/Card'
import { formatDateCourte, formatFCFA } from '@/lib/utils'
import type { Ticket } from '@/types'
import Link from 'next/link'

interface EcheancesWidgetProps {
  tickets: Ticket[]
}

const STATUTS_ACTIFS = ['nouveau', 'en_traitement', 'pret']

/**
 * Échéances du pressing : tickets dont la date de retrait est dépassée
 * ou prévue aujourd'hui. C'est la liste de travail du jour.
 */
export default function EcheancesWidget({ tickets }: EcheancesWidgetProps) {
  const debutJour = new Date()
  debutJour.setHours(0, 0, 0, 0)
  const finJour = new Date(debutJour.getTime() + 86400_000)

  const actifs = tickets.filter((t) => STATUTS_ACTIFS.includes(t.statut))
  const enRetard = actifs.filter((t) => new Date(t.date_prevue) < debutJour)
  const duJour = actifs.filter((t) => {
    const d = new Date(t.date_prevue)
    return d >= debutJour && d < finJour
  })

  const aAfficher = [...enRetard, ...duJour].slice(0, 6)

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Échéances</h2>
        <div className="flex gap-1.5">
          {enRetard.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {enRetard.length} en retard
            </span>
          )}
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {duJour.length} aujourd’hui
          </span>
        </div>
      </div>

      {aAfficher.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <span className="mb-1 text-3xl">👌</span>
          <p className="text-sm text-gray-500">Rien à livrer aujourd’hui, tout est à jour.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {aAfficher.map((t) => {
            const retard = new Date(t.date_prevue) < debutJour
            return (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between gap-2 py-2 active:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {t.numero} — {t.client?.nom ?? 'Client'}
                  </p>
                  <p className={`text-xs ${retard ? 'font-semibold text-red-600' : 'text-amber-600'}`}>
                    {retard ? `⚠ Prévu le ${formatDateCourte(t.date_prevue)}` : 'À livrer aujourd’hui'}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-700">
                  {formatFCFA(t.montant_total)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
