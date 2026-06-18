import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  let iconSrc: string | null = null

  try {
    // Priorité 1 : uid dans l'URL (injecté par le dashboard layout, sans cookie)
    const uid = request.nextUrl.searchParams.get('uid')

    if (uid) {
      const admin = createAdminClient()
      const { data: profil } = await admin
        .from('profils')
        .select('logo_url')
        .eq('user_id', uid)
        .maybeSingle()
      const logoUrl = (profil?.logo_url as string | null)?.split('?')[0]
      if (logoUrl) {
        iconSrc = `/api/pwa-icon?u=${encodeURIComponent(logoUrl)}`
      }
    } else {
      // Priorité 2 : session cookie (fallback pour les pages hors dashboard)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profil } = await supabase
          .from('profils')
          .select('logo_url')
          .eq('user_id', user.id)
          .maybeSingle()
        const logoUrl = (profil?.logo_url as string | null)?.split('?')[0]
        if (logoUrl) {
          iconSrc = `/api/pwa-icon?u=${encodeURIComponent(logoUrl)}`
        }
      }
    }
  } catch {
    // fallback sur les icônes statiques
  }

  // Chrome Android choisit l'icône maskable en priorité pour l'écran d'accueil.
  // Si l'utilisateur a un logo, on l'utilise pour TOUS les purposes (any + maskable).
  const icons = iconSrc
    ? [
        { src: iconSrc, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: iconSrc, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: iconSrc, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]
    : [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]

  const manifest = {
    name: 'Pressing Ivoire',
    short_name: 'Pressing Ivoire',
    description: "Gérez votre pressing depuis votre téléphone : dépôts, clients, caisse, notifications.",
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#E1F5EE',
    theme_color: '#0F6E56',
    lang: 'fr',
    categories: ['business', 'productivity'],
    icons,
    shortcuts: [
      {
        name: 'Nouveau dépôt',
        url: '/tickets/nouveau',
        description: 'Enregistrer un nouveau dépôt de linge',
      },
      {
        name: 'Caisse du jour',
        url: '/caisse',
        description: 'Voir les encaissements du jour',
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'private, no-cache, no-store',
    },
  })
}
