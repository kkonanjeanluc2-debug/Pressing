import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const ROUTES_PUBLIQUES = ['/login', '/register', '/landing']

interface JwtPayload {
  sub: string
  exp: number
  user_metadata?: Record<string, unknown>
}

/**
 * Décode le JWT Supabase depuis les cookies sans aucun appel réseau.
 * Les cookies SSR de Supabase suivent le pattern sb-<ref>-auth-token[.0,.1,…]
 */
function lireJwt(request: NextRequest): JwtPayload | null {
  const parts = request.cookies
    .getAll()
    .filter((c) => /^sb-.+-auth-token/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)

  if (parts.length === 0) return null

  try {
    const raw = decodeURIComponent(parts.join(''))
    const session = JSON.parse(raw) as { access_token?: string }
    const token = session.access_token
    if (!token) return null

    const b64 = token.split('.')[1]
    if (!b64) return null

    const payload = JSON.parse(
      atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
    ) as JwtPayload

    // Token expiré → le client Supabase gèrera le refresh côté navigateur
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Protège les routes et rafraîchit les cookies de session.
 * Les décisions de routing sont basées sur le JWT local (zéro réseau).
 * Seul /admin fait un appel DB pour vérifier le super-admin.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  const pathname = request.nextUrl.pathname
  const estRoutePublique = ROUTES_PUBLIQUES.some((r) => pathname.startsWith(r))
  const estRouteApi = pathname.startsWith('/api')
  const estRoutePartenaire = pathname.startsWith('/partenaire')
  const estRouteAdmin = pathname.startsWith('/admin')

  // Lecture locale du JWT — aucun appel réseau
  const jwt = lireJwt(request)
  const userId = jwt?.sub ?? null
  const meta = (jwt?.user_metadata ?? {}) as Record<string, unknown>

  // Non connecté (ou token expiré) → /login
  if (!userId && !estRoutePublique && !estRouteApi) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (userId) {
    // Compte désactivé
    if (meta.compte_actif === false && !estRoutePublique && !estRouteApi) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Partenaire → espace /partenaire uniquement
    if (meta.role === 'partenaire') {
      if (!estRoutePartenaire && !estRouteApi) {
        const url = request.nextUrl.clone()
        url.pathname = '/partenaire'
        return NextResponse.redirect(url)
      }
      return NextResponse.next({ request })
    }

    // Connecté → pas d'accès aux pages publiques
    if (estRoutePublique) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Utilisateur ordinaire → pas d'accès à /partenaire
    if (estRoutePartenaire) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // /admin → seul appel DB restant (route rare, utilisée uniquement par les admins)
    if (estRouteAdmin) {
      let supabaseResponse = NextResponse.next({ request })
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) => {
                supabaseResponse.cookies.set(name, value, options)
              })
            },
          },
        }
      )

      const { data: adminRow } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!adminRow) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      return supabaseResponse
    }
  }

  return NextResponse.next({ request })
}
