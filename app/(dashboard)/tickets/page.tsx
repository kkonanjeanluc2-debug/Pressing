'use client'

import TicketCard from '@/components/tickets/TicketCard'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import { useTickets, type FiltreTickets } from '@/hooks/useTickets'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useRef, useState } from 'react'

const FILTRES: Array<{ id: FiltreTickets; label: string }> = [
  { id: 'tous', label: 'Tous' },
  { id: 'prets', label: 'Prêts' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'non_payes', label: 'Non payés' },
]

function ListeTickets() {
  const searchParams = useSearchParams()
  const filtreInitial = (searchParams.get('filtre') as FiltreTickets | null) ?? 'tous'
  const pressingInitial = searchParams.get('pressing') ?? 'tous'

  const { pressings } = usePressing()
  const { peut } = useProfil()
  const [filtre, setFiltre] = useState<FiltreTickets>(filtreInitial)
  const [pressingFiltre, setPressingFiltre] = useState<string>(pressingInitial)
  const [recherche, setRecherche] = useState('')

  const idsTous = pressings.map((p) => p.id)
  const idsSelection =
    pressingFiltre === 'tous' ? idsTous : idsTous.filter((id) => id === pressingFiltre)
  const { tickets, chargement, erreur, recharger } = useTickets(
    idsSelection.length > 0 ? idsSelection : null,
    filtre
  )

  const pressingSelectionne = pressings.find((p) => p.id === pressingFiltre)

  // Pull-to-refresh simple (glisser vers le bas en haut de page)
  const toucheDebutY = useRef(0)
  const [rafraichissement, setRafraichissement] = useState(false)

  const surToucheFin = useCallback(
    async (e: React.TouchEvent) => {
      const delta = e.changedTouches[0] ? e.changedTouches[0].clientY - toucheDebutY.current : 0
      if (delta > 90 && window.scrollY === 0 && !rafraichissement) {
        setRafraichissement(true)
        await recharger()
        setRafraichissement(false)
      }
    },
    [recharger, rafraichissement]
  )

  const rechercheNorm = recherche.trim().toLowerCase()
  const ticketsFiltres = rechercheNorm
    ? tickets.filter(
        (t) =>
          t.numero.toLowerCase().includes(rechercheNorm) ||
          (t.client?.nom ?? '').toLowerCase().includes(rechercheNorm)
      )
    : tickets

  return (
    <div
      className="space-y-4 px-4 pt-5"
      onTouchStart={(e) => {
        toucheDebutY.current = e.touches[0]?.clientY ?? 0
      }}
      onTouchEnd={(e) => void surToucheFin(e)}
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-pressci-dark">Tickets</h1>
          {pressingSelectionne && (
            <p className="text-sm text-gray-500">{pressingSelectionne.nom}</p>
          )}
        </div>
        {peut('creer_tickets') && (
          <Link
            href={
              pressingFiltre !== 'tous'
                ? `/tickets/nouveau?pressing=${pressingFiltre}`
                : '/tickets/nouveau'
            }
            className="rounded-full bg-pressci-primary px-4 py-2 text-sm font-semibold text-white"
          >
            + Nouveau
          </Link>
        )}
      </header>

      {/* Filtre par pressing (propriétaire multi-pressings) */}
      {pressings.length > 1 && (
        <select
          value={pressingFiltre}
          onChange={(e) => setPressingFiltre(e.target.value)}
          aria-label="Filtrer par pressing"
          className="w-full rounded-card border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-pressci-primary lg:max-w-xs"
        >
          <option value="tous">Tous les pressings</option>
          {pressings.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
              {p.commune ? ` — ${p.commune}` : ''}
            </option>
          ))}
        </select>
      )}

      {rafraichissement && (
        <div className="flex justify-center">
          <span className="spinner spinner-dark" />
        </div>
      )}

      <div className="space-y-4 lg:flex lg:items-center lg:gap-4 lg:space-y-0">
        <input
          type="search"
          placeholder="Rechercher un client ou un numéro…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent lg:max-w-sm"
        />

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTRES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltre(f.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
                filtre === f.id
                  ? 'bg-pressci-primary text-white'
                  : 'border border-gray-300 bg-white text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : ticketsFiltres.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          <p className="mb-2 text-4xl">🧺</p>
          <p>Aucun ticket pour le moment.</p>
          <Link href="/tickets/nouveau" className="mt-2 inline-block font-semibold text-pressci-primary">
            Créer le premier dépôt
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ticketsFiltres.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      }
    >
      <ListeTickets />
    </Suspense>
  )
}
