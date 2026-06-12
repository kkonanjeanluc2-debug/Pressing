'use client'

import TicketDetail from '@/components/tickets/TicketDetail'
import { usePressing } from '@/hooks/usePressing'
import { useTicket } from '@/hooks/useTickets'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function DetailTicket({ ticketId }: { ticketId: string }) {
  const searchParams = useSearchParams()
  const estNouveau = searchParams.get('nouveau') === '1'

  const { pressings } = usePressing()
  const { ticket, chargement, erreur, recharger } = useTicket(ticketId)
  // Le pressing du ticket (et non le premier de la liste)
  const pressing = pressings.find((p) => p.id === ticket?.pressing_id) ?? pressings[0] ?? null

  if (chargement || !pressing) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (erreur || !ticket) {
    return (
      <div className="px-4 py-10 text-center text-gray-600">
        <p className="mb-2">Ticket introuvable.</p>
        <Link href="/tickets" className="font-semibold text-pressci-primary">
          Retour aux tickets
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/tickets"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-pressci-dark">Ticket {ticket.numero}</h1>
      </header>

      <TicketDetail
        ticket={ticket}
        pressing={pressing}
        recharger={recharger}
        nouveauticket={estNouveau}
      />
    </div>
  )
}

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      }
    >
      <DetailTicket ticketId={params.id} />
    </Suspense>
  )
}
