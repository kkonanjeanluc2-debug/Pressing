import PrechargeurDonnees from '@/components/PrechargeurDonnees'
import BottomNav from '@/components/ui/BottomNav'
import OfflineBanner from '@/components/ui/OfflineBanner'
import SideNav from '@/components/ui/SideNav'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

// Toutes les pages du dashboard requièrent une session Supabase :
// on désactive le prérendu statique pour éviter l'erreur de build.
export const dynamic = 'force-dynamic'

/**
 * Injecte un manifest URL spécifique à l'utilisateur connecté.
 * Chrome fetche le manifest parfois sans cookies — l'UID dans l'URL
 * garantit que le bon logo est toujours retourné.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profil } = await supabase
        .from('profils')
        .select('logo_url')
        .eq('user_id', user.id)
        .maybeSingle()
      const logoUrl = (profil?.logo_url as string | null)?.split('?')[0]
      const iconUrl = logoUrl
        ? `/api/pwa-icon?u=${encodeURIComponent(logoUrl)}`
        : '/api/pwa-icon'
      return {
        manifest: `/api/pwa-manifest?uid=${user.id}`,
        icons: {
          apple: [{ url: iconUrl, sizes: '180x180', type: 'image/png' }],
        },
      }
    }
  } catch {
    // pas de session → manifest par défaut du root layout
  }
  return {}
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Préchargement silencieux des tickets et clients */}
      <PrechargeurDonnees />
      {/* Navigation latérale — desktop uniquement (réductible) */}
      <SideNav />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <main className="flex-1 pb-24 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl lg:px-8 lg:pt-4">{children}</div>
        </main>
        {/* Navigation basse — mobile uniquement */}
        <BottomNav />
      </div>
    </div>
  )
}
