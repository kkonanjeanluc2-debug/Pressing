import Badge from '@/components/ui/Badge'
import { estEnRetard, formatDateCourte, formatFCFA } from '@/lib/utils'
import type { Ticket } from '@/types'
import Link from 'next/link'

interface TicketCardProps {
  ticket: Ticket
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const enRetard = estEnRetard(ticket.date_prevue, ticket.statut)
  const resteAPayer = ticket.montant_total - ticket.montant_paye

  return (
    <Link href={`/tickets/${ticket.id}`} className="block">
      <div className="rounded-card border border-gray-200 bg-white p-4 active:bg-gray-50">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-bold text-pressci-dark">{ticket.numero}</span>
          <Badge statut={ticket.statut} />
        </div>

        <p className="font-medium text-gray-800">{ticket.client?.nom ?? 'Client'}</p>

        <div className="mt-2 flex items-center justify-between text-sm">
          <span className={enRetard ? 'font-semibold text-red-600' : 'text-gray-500'}>
            {enRetard ? '⚠ Retrait dépassé — ' : 'Prévu le '}
            {formatDateCourte(ticket.date_prevue)}
          </span>
          <span className="font-semibold text-gray-800">{formatFCFA(ticket.montant_total)}</span>
        </div>

        {resteAPayer > 0 && ticket.statut !== 'annule' && (
          <p className="mt-1 text-xs font-medium text-orange-600">
            Reste à payer : {formatFCFA(resteAPayer)}
          </p>
        )}
      </div>
    </Link>
  )
}
