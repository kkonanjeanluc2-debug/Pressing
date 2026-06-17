import { createClient } from '@/lib/supabase/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pwa-icon
 * Sert le logo du pressing connecté pour l'icône PWA (Android + iOS).
 * Fallback sur l'icône statique par défaut si aucun logo n'est défini.
 */
export async function GET(): Promise<NextResponse> {
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
      if (logoUrl) {
        const res = await fetch(logoUrl)
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          const contentType = res.headers.get('Content-Type') ?? 'image/png'
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'private, max-age=3600',
            },
          })
        }
      }
    }
  } catch {
    // fallback
  }

  const iconPath = join(process.cwd(), 'public', 'icons', 'icon-192.png')
  const buffer = await readFile(iconPath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
