import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pwa-icon?u=<encoded-supabase-url>
 * Proxy same-origin pour l'icône PWA : contourne la restriction
 * des icônes cross-origin dans le manifest Chrome Android.
 * Fallback sur l'icône statique si aucune URL fournie.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const logoUrl = request.nextUrl.searchParams.get('u')

  if (logoUrl) {
    try {
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
    } catch {
      // fallback
    }
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
