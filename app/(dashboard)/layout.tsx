import PrechargeurDonnees from '@/components/PrechargeurDonnees'
import BottomNav from '@/components/ui/BottomNav'
import OfflineBanner from '@/components/ui/OfflineBanner'
import SideNav from '@/components/ui/SideNav'

// Toutes les pages du dashboard requièrent une session Supabase :
// on désactive le prérendu statique pour éviter l'erreur de build.
export const dynamic = 'force-dynamic'

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
