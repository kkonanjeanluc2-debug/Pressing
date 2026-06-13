'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const LIENS = [
  {
    href: '/partenaire',
    label: 'Tableau de bord',
    actif: (p: string) => p === '/partenaire',
    icone: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    href: '/partenaire/contrat',
    label: 'Mon contrat',
    actif: (p: string) => p.startsWith('/partenaire/contrat'),
    icone: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

export default function PartenaireLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [nom, setNom] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      const meta = data.user?.user_metadata as { nom?: string } | undefined
      setNom(meta?.nom ?? null)
    })
  }, [])

  async function seDeconnecter() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* ---- Sidebar ---- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-pressci-dark to-pressci-primary text-white lg:flex">
        <div className="border-b border-white/20 px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">
              🤝
            </span>
            <div>
              <p className="text-sm font-bold">Espace Partenaire</p>
              <p className="text-xs text-white/60">Pressing Ivoire</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {LIENS.map((lien) => {
            const actif = lien.actif(pathname)
            return (
              <Link
                key={lien.href}
                href={lien.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  actif ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {lien.icone}
                {lien.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/20 px-5 py-4">
          <p className="truncate text-sm font-semibold text-white">{nom ?? 'Partenaire'}</p>
          <p className="truncate text-xs text-white/60">{email ?? ''}</p>
          <button
            type="button"
            onClick={() => void seDeconnecter()}
            className="mt-3 flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ---- Contenu ---- */}
      <div className="min-w-0 flex-1 bg-gray-50">
        {/* Navigation mobile */}
        <nav className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-gray-200 bg-gradient-to-r from-pressci-dark to-pressci-primary px-4 py-2 lg:hidden">
          <span className="mr-2 text-sm font-bold text-white">🤝</span>
          {LIENS.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                lien.actif(pathname) ? 'bg-white text-pressci-primary' : 'text-white/80'
              }`}
            >
              {lien.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void seDeconnecter()}
            className="ml-auto whitespace-nowrap text-xs text-white/70"
          >
            Déconnexion
          </button>
        </nav>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
