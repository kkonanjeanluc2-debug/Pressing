'use client'

import PressingSwitcher from '@/components/ui/PressingSwitcher'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const CLE_SIDEBAR = 'pressci_sidebar_reduite'

interface Lien {
  href: string
  label: string
  icone: React.ReactNode
  actif: (pathname: string) => boolean
}

const ICONE = 'h-5 w-5 shrink-0'

const LIENS: Lien[] = [
  {
    href: '/',
    label: 'Tableau de bord',
    actif: (p) => p === '/',
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    href: '/pressings',
    label: 'Pressings',
    actif: (p) => p.startsWith('/pressings'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    href: '/tickets',
    label: 'Tickets',
    actif: (p) => p.startsWith('/tickets'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    href: '/clients',
    label: 'Clients',
    actif: (p) => p.startsWith('/clients'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
      </svg>
    ),
  },
  {
    href: '/caisse',
    label: 'Caisse',
    actif: (p) => p.startsWith('/caisse'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/stats',
    label: 'Rapports',
    actif: (p) => p.startsWith('/stats'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/parametres',
    label: 'Paramètres',
    actif: (p) => p.startsWith('/parametres'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

/** Navigation latérale fixe — affichée uniquement sur grand écran (lg+). */
export default function SideNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [reduite, setReduite] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    setReduite(window.localStorage.getItem(CLE_SIDEBAR) === '1')
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  function basculerReduction() {
    setReduite((r) => {
      window.localStorage.setItem(CLE_SIDEBAR, r ? '0' : '1')
      return !r
    })
  }

  async function seDeconnecter() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-gray-200 bg-white transition-all lg:flex',
        reduite ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 border-b border-gray-100 py-5', reduite ? 'justify-center px-2' : 'px-5')}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pressci-primary text-xl font-bold text-white">
          P
        </div>
        {!reduite && (
          <div>
            <p className="text-lg font-bold text-pressci-dark">PressCI</p>
            <p className="text-xs text-gray-400">Gestion de pressing</p>
          </div>
        )}
      </div>

      {/* Pressing actif */}
      {!reduite && (
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Pressing actif
          </p>
          <PressingSwitcher className="w-full text-sm" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {LIENS.map((lien) => {
          const actif = lien.actif(pathname)
          return (
            <Link
              key={lien.href}
              href={lien.href}
              title={lien.label}
              className={cn(
                'relative flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors',
                reduite && 'justify-center px-0',
                actif
                  ? 'bg-pressci-light text-pressci-primary'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              {actif && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-pressci-primary" />
              )}
              {lien.icone}
              {!reduite && lien.label}
            </Link>
          )
        })}
      </nav>

      {/* Profil + actions */}
      <div className="border-t border-gray-100 px-3 py-4">
        <div className={cn('mb-3 flex items-center gap-3', reduite && 'justify-center')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pressci-light text-sm font-bold text-pressci-primary">
            {(email ?? 'P').charAt(0).toUpperCase()}
          </div>
          {!reduite && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{email ?? '…'}</p>
              <p className="text-xs text-gray-400">Propriétaire</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void seDeconnecter()}
          title="Déconnexion"
          className={cn(
            'flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600',
            reduite && 'justify-center px-0'
          )}
        >
          <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!reduite && 'Déconnexion'}
        </button>

        <button
          type="button"
          onClick={basculerReduction}
          title={reduite ? 'Agrandir' : 'Réduire'}
          className={cn(
            'mt-1 flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700',
            reduite && 'justify-center px-0'
          )}
        >
          <svg
            className={cn(ICONE, reduite && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!reduite && 'Réduire'}
        </button>
      </div>
    </aside>
  )
}
