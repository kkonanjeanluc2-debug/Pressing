'use client'

import { useProfil } from '@/hooks/useProfil'
import { cn } from '@/lib/utils'
import { viderCache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const IC = 'h-6 w-6'

/* ─── Icônes inline ─────────────────────────────────────────────────────── */
const IcoAccueil = () => (
  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
  </svg>
)
const IcoTicket = () => (
  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
)
const IcoCaisse = () => (
  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IcoClients = () => (
  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
  </svg>
)
const IcoMenu = () => (
  <svg className={IC} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)
const IcoPressing = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M9 21v-6h6v6" />
  </svg>
)
const IcoVetements = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l5 3-2.5 4L16 8.5V21H8V8.5L5.5 10 3 6l5-3a4 4 0 008 0z" />
  </svg>
)
const IcoCompta = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)
const IcoStats = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)
const IcoParams = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IcoDeconnexion = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

/* ─── Routes qui activent l'onglet "Menu" ───────────────────────────────── */
const ROUTES_MENU = ['/pressings', '/vetements', '/comptabilite', '/stats', '/parametres']

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, agent, peut } = useProfil()
  const [menuOuvert, setMenuOuvert] = useState(false)

  const menuActif = ROUTES_MENU.some((r) => pathname.startsWith(r))

  async function seDeconnecter() {
    setMenuOuvert(false)
    const supabase = createClient()
    if (role === 'agent' && agent) {
      await supabase.rpc('fermer_pressing', { p_pressing_id: agent.pressing_id })
    }
    await supabase.auth.signOut()
    viderCache()
    router.push('/login')
    router.refresh()
  }

  /* liens filtrés selon le rôle — mêmes règles que SideNav */
  const peutVoirCaisse = role !== 'agent' || peut('voir_caisse')
  const peutVoirClients = role !== 'agent' || peut('gerer_clients')
  const peutVoirCompta = role !== 'agent' || peut('gerer_depenses')
  const peutVoirStats = role !== 'agent' || peut('voir_stats')
  const estProprietaire = role !== 'agent'

  return (
    <>
      {/* ── Barre fixe du bas ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-safe print:hidden lg:hidden">
        <div className={cn('grid', peutVoirCaisse && peutVoirClients ? 'grid-cols-5' : 'grid-cols-4')}>

          {/* Accueil */}
          <Link
            href="/"
            className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              pathname === '/' ? 'text-pressci-primary' : 'text-gray-400')}
          >
            <IcoAccueil />
            Accueil
          </Link>

          {/* Tickets */}
          <Link
            href="/tickets"
            className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              pathname.startsWith('/tickets') ? 'text-pressci-primary' : 'text-gray-400')}
          >
            <IcoTicket />
            Tickets
          </Link>

          {/* Caisse — si permission */}
          {peutVoirCaisse && (
            <Link
              href="/caisse"
              className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                pathname.startsWith('/caisse') ? 'text-pressci-primary' : 'text-gray-400')}
            >
              <IcoCaisse />
              Caisse
            </Link>
          )}

          {/* Clients — si permission */}
          {peutVoirClients && (
            <Link
              href="/clients"
              className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                pathname.startsWith('/clients') ? 'text-pressci-primary' : 'text-gray-400')}
            >
              <IcoClients />
              Clients
            </Link>
          )}

          {/* Menu ─ ouvre le tiroir */}
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              menuActif || menuOuvert ? 'text-pressci-primary' : 'text-gray-400')}
          >
            <IcoMenu />
            Menu
          </button>
        </div>
      </nav>

      {/* ── Tiroir de navigation (bottom sheet) ── */}
      {menuOuvert && (
        <>
          {/* Fond semi-transparent */}
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setMenuOuvert(false)}
          />

          {/* Feuille glissante */}
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white pb-safe shadow-2xl lg:hidden">
            {/* Poignée */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="px-4 pb-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Navigation
              </p>

              <div className="space-y-1">
                {/* Pressings — propriétaire uniquement */}
                {estProprietaire && (
                  <Link
                    href="/pressings"
                    onClick={() => setMenuOuvert(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                      pathname.startsWith('/pressings')
                        ? 'bg-pressci-light text-pressci-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <IcoPressing />
                    Pressings
                  </Link>
                )}

                {/* Vêtements */}
                <Link
                  href="/vetements"
                  onClick={() => setMenuOuvert(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                    pathname.startsWith('/vetements')
                      ? 'bg-pressci-light text-pressci-primary'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <IcoVetements />
                  Vêtements
                </Link>

                {/* Comptabilité */}
                {peutVoirCompta && (
                  <Link
                    href="/comptabilite"
                    onClick={() => setMenuOuvert(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                      pathname.startsWith('/comptabilite')
                        ? 'bg-pressci-light text-pressci-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <IcoCompta />
                    Comptabilité
                  </Link>
                )}

                {/* Rapports */}
                {peutVoirStats && (
                  <Link
                    href="/stats"
                    onClick={() => setMenuOuvert(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                      pathname.startsWith('/stats')
                        ? 'bg-pressci-light text-pressci-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <IcoStats />
                    Rapports
                  </Link>
                )}

                {/* Paramètres — propriétaire uniquement */}
                {estProprietaire && (
                  <Link
                    href="/parametres"
                    onClick={() => setMenuOuvert(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                      pathname.startsWith('/parametres')
                        ? 'bg-pressci-light text-pressci-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <IcoParams />
                    Paramètres
                  </Link>
                )}
              </div>

              {/* Séparateur + déconnexion */}
              <div className="mt-3 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => void seDeconnecter()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  <IcoDeconnexion />
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
