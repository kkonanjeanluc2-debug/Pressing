import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { formatDateCourte, formatFCFA, formatHeure } from '@/lib/utils'
import type { Ticket } from '@/types'
import Link from 'next/link'

interface ActiviteRecenteProps {
  tickets: Ticket[]
}

/** Derniers dépôts enregistrés, avec leur statut en direct. */
export default function ActiviteRecente({ tickets }: ActiviteRecenteProps) {
  const recents = tickets.slice(0, 6)

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Activité récente</h2>
        <Link href="/tickets" className="text-sm font-semibold text-pressci-primary">
          Tout voir →
        </Link>
      </div>

      {recents.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Aucun dépôt pour l’instant — le premier apparaîtra ici.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {recents.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="flex items-center justify-between gap-3 py-2.5 active:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {t.numero} — {t.client?.nom ?? 'Client'}
                </p>
                <p className="text-xs text-gray-400">
                  {t.statut === 'recupere' && t.date_recuperation
                    ? `Récupéré le ${formatDateCourte(t.date_recuperation)} à ${formatHeure(t.date_recuperation)}`
                    : `Déposé le ${formatDateCourte(t.date_depot)}`}{' '}
                  · {(t.articles ?? []).reduce((s, a) => s + a.quantite, 0)} pièce
                  {(t.articles ?? []).reduce((s, a) => s + a.quantite, 0) > 1 ? 's' : ''}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-gray-700">
                {formatFCFA(t.montant_total)}
              </span>
              <Badge statut={t.statut} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
