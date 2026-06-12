import type { DashboardStats } from '@/types'
import Link from 'next/link'

interface KpiGridProps {
  stats: DashboardStats
  /** Dépôts créés aujourd'hui (pressing actif) */
  depotsJour: number
  /** Nombre de pressings du compte */
  nbPressings: number
}

interface Tuile {
  label: string
  valeur: string
  couleur: string
  href: string
  icone: React.ReactNode
}

const ICONE = 'absolute right-2 top-2 h-12 w-12 opacity-20'

function nombre(n: number): string {
  return n.toLocaleString('fr-FR')
}

export default function KpiGrid({ stats, depotsJour, nbPressings }: KpiGridProps) {
  const tuiles: Tuile[] = [
    {
      label: 'Tickets actifs',
      valeur: nombre(stats.tickets_actifs),
      couleur: 'bg-blue-500',
      href: '/tickets',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      label: 'Prêts à récupérer',
      valeur: nombre(stats.tickets_prets),
      couleur: 'bg-green-600',
      href: '/tickets?filtre=prets',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Dépôts aujourd’hui',
      valeur: nombre(depotsJour),
      couleur: 'bg-orange-500',
      href: '/tickets',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
    {
      label: 'Recettes du jour (FCFA)',
      valeur: nombre(stats.ca_jour),
      couleur: 'bg-emerald-500',
      href: '/caisse',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'CA du mois (FCFA)',
      valeur: nombre(stats.ca_mois),
      couleur: 'bg-pressci-primary',
      href: '/stats',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: 'Créances (FCFA)',
      valeur: nombre(stats.creances_total),
      couleur: 'bg-red-500',
      href: '/tickets?filtre=non_payes',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
    },
    {
      label: 'Clients',
      valeur: nombre(stats.clients_total),
      couleur: 'bg-violet-600',
      href: '/clients',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
        </svg>
      ),
    },
    {
      label: nbPressings > 1 ? 'Pressings' : 'Mon pressing',
      valeur: nombre(nbPressings),
      couleur: 'bg-amber-500',
      href: '/pressings',
      icone: (
        <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M9 21v-6h6v6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {tuiles.map((tuile) => (
        <Link
          key={tuile.label}
          href={tuile.href}
          className={`relative overflow-hidden rounded-card p-4 text-white shadow-sm transition-transform active:scale-95 hover:brightness-110 ${tuile.couleur}`}
        >
          {tuile.icone}
          <p className="relative text-2xl font-bold leading-tight">{tuile.valeur}</p>
          <p className="relative mt-0.5 truncate text-xs font-medium opacity-90">{tuile.label}</p>
          <div className="mt-3 flex justify-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-xs leading-none">
              +
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
