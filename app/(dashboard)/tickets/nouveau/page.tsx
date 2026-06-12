'use client'

import TicketForm from '@/components/tickets/TicketForm'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function NouveauTicket() {
  const searchParams = useSearchParams()
  const pressingInitial = searchParams.get('pressing')

  const { pressings, chargement } = usePressing()
  const { peut, chargement: chargementProfil } = useProfil()

  if (!chargementProfil && !peut('creer_tickets')) {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🔒</p>
        <p className="font-semibold">Accès non autorisé.</p>
        <p className="mt-1 text-sm">
          Le propriétaire ne vous a pas donné le droit de créer des dépôts.
        </p>
      </div>
    )
  }

  if (chargement) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (pressings.length === 0) {
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

      <TicketForm pressings={pressings} pressingInitial={pressingInitial} />
    </div>
  )
}

export default function NouveauTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      }
    >
      <NouveauTicket />
    </Suspense>
  )
}
