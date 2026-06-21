'use client'

import SansPressing from '@/components/ui/SansPressing'
import { useClients } from '@/hooks/useClients'
import { usePressing } from '@/hooks/usePressing'
import { formatFCFA } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'

export default function ClientsPage() {
  const { pressing, pressings, chargement: chargementPressing } = usePressing()
  const ids = pressings.map((p) => p.id)
  const { clients, chargement, erreur } = useClients(ids.length > 0 ? ids : null)
  const [recherche, setRecherche] = useState('')

  if (!chargementPressing && !pressing) return <SansPressing />

  const rechercheNorm = recherche.trim().toLowerCase()
  const clientsFiltres = rechercheNorm
    ? clients.filter(
        (c) =>
          c.nom.toLowerCase().includes(rechercheNorm) || c.telephone.includes(rechercheNorm)
      )
    : clients

  return (
    <div className="space-y-4 px-4 pt-5">
      <header>
        <h1 className="text-xl font-bold text-pressci-dark">Clients</h1>
        <p className="text-sm text-gray-500">
          {clients.length} client{clients.length > 1 ? 's' : ''} enregistré
          {clients.length > 1 ? 's' : ''}
        </p>
      </header>

      <input
        type="search"
        placeholder="Rechercher par nom ou téléphone…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent lg:max-w-sm"
      />

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : clientsFiltres.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          <p className="mb-2 text-4xl">👥</p>
          <p>Aucun client pour l’instant. Ils seront créés à votre premier dépôt.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {clientsFiltres.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="block">
              <div className="flex items-center justify-between rounded-card border border-gray-200 bg-white p-4 active:bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-800">
                    {c.nom}{' '}
                    {c.nombre_depots >= 5 && (
                      <span title="Client fidèle" className="text-sm">
                        ⭐
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {c.telephone} · {c.nombre_depots} dépôt{c.nombre_depots > 1 ? 's' : ''}
                  </p>
                </div>
                {c.solde_creance > 0 && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    {formatFCFA(c.solde_creance)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
