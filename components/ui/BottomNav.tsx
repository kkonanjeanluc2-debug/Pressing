'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Onglet {
  href: string
  label: string
  icone: React.ReactNode
  actif: (pathname: string) => boolean
}

const ICONE_CLASSE = 'h-6 w-6'

const ONGLETS: Onglet[] = [
  {
    href: '/',
    label: 'Accueil',
    actif: (p) => p === '/',
    icone: (
      <svg className={ICONE_CLASSE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    href: '/tickets',
    label: 'Tickets',
    actif: (p) => p.startsWith('/tickets'),
    icone: (
      <svg className={ICONE_CLASSE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    href: '/clients',
    label: 'Clients',
    actif: (p) => p.startsWith('/clients'),
    icone: (
      <svg className={ICONE_CLASSE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
      </svg>
    ),
  },
  {
    href: '/stats',
    label: 'Stats',
    actif: (p) => p.startsWith('/stats') || p.startsWith('/caisse'),
    icone: (
      <svg className={ICONE_CLASSE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-safe print:hidden lg:hidden">
      <div className="grid grid-cols-4">
        {ONGLETS.map((onglet) => {
          const actif = onglet.actif(pathname)
          return (
            <Link
              key={onglet.href}
              href={onglet.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                actif ? 'text-pressci-primary' : 'text-gray-400'
              )}
            >
              {onglet.icone}
              {onglet.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
