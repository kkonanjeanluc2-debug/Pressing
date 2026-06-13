'use client'

import { useProfilProprietaire } from '@/hooks/useProfilProprietaire'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const ICONE = 'h-5 w-5 shrink-0'

const LIENS = [
  {
    href: '/admin',
    label: 'Tableau de bord',
    actif: (p: string) => p === '/admin',
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    href: '/admin/utilisateurs',
    label: 'Utilisateurs',
    actif: (p: string) => p.startsWith('/admin/utilisateurs'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
      </svg>
    ),
  },
  {
    href: '/admin/abonnements',
    label: 'Abonnements',
    actif: (p: string) => p.startsWith('/admin/abonnements'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h4m-8 4h18a2 2 0 002-2V7a2 2 0 00-2-2H3a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/activite',
    label: 'Activité globale',
    actif: (p: string) => p.startsWith('/admin/activite'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-9 4 18 3-9h4" />
      </svg>
    ),
  },
  {
    href: '/admin/partenaires',
    label: 'Partenaires',
    actif: (p: string) => p.startsWith('/admin/partenaires'),
    icone: (
      <svg className={ICONE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c1.5 0 2.7 1 3 2.4" />
      </svg>
    ),
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { estAdmin, chargement } = useSuperAdmin()
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const { proprietaire } = useProfilProprietaire(userId)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setUserId(data.user?.id ?? null)
    })
  }, [])

  if (chargement) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (!estAdmin) {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🛡️</p>
        <p className="font-semibold">Espace réservé à l'administrateur de la plateforme.</p>
        <Link href="/" className="mt-2 inline-block font-semibold text-pressci-primary">
          Retour à l'application
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* ---- Sidebar console admin ---- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 text-slate-300 lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-sm font-bold uppercase tracking-wide text-white">Console Admin</p>
          <p className="text-xs text-slate-400">Pressing Ivoire — plateforme</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {LIENS.map((lien) => {
            const actif = lien.actif(pathname)
            return (
              <Link
                key={lien.href}
                href={lien.href}
                className={cn(
                  'flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors',
                  actif
                    ? 'bg-pressci-primary text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                {lien.icone}
                {lien.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-sm font-semibold text-white">
            {proprietaire?.nom ?? 'Administrateur'}
          </p>
          <p className="truncate text-xs text-slate-400">{email ?? ''}</p>
          <Link
            href="/"
            className="mt-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            ← Retour au tableau de bord
          </Link>
        </div>
      </aside>

      {/* ---- Contenu ---- */}
      <div className="min-w-0 flex-1 bg-gray-50">
        {/* Navigation mobile */}
        <nav className="no-scrollbar flex gap-2 overflow-x-auto border-b border-gray-200 bg-slate-900 px-4 py-2 lg:hidden">
          {LIENS.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium',
                lien.actif(pathname) ? 'bg-pressci-primary text-white' : 'text-slate-300'
              )}
            >
              {lien.label}
            </Link>
          ))}
          <Link href="/" className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-slate-300">
            ← App
          </Link>
        </nav>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
