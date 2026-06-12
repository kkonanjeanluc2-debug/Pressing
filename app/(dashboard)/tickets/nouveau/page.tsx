'use client'

import TicketForm from '@/components/tickets/TicketForm'
import { usePressing } from '@/hooks/usePressing'
import Link from 'next/link'

export default function NouveauTicketPage() {
  const { pressing, chargement } = usePressing()

  if (chargement) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (!pressing) {
    return <p className="px-4 py-10 text-center text-gray-600">Aucun pressing trouvé.</p>
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/tickets"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-pressci-dark">Nouveau dépôt</h1>
      </header>

      <TicketForm pressingId={pressing.id} />
    </div>
  )
}
