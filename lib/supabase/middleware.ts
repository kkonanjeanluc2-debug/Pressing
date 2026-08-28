import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const ROUTES_PUBLIQUES = ['/login', '/register', '/landing']

interface JwtPayload {
  sub: string
  exp: number
  user_metadata?: Record<string, unknown>
}

interface SessionInfo {
  /** true si un cookie d'auth Supabase existe dans la requête */
  cookiePresent: boolean
  /** payload JWT décodé localement (null si absent ou expiré) */
  payload: JwtPayload | null
}

/**
 * Lit le cookie de session Supabase SSR et tente de décoder le JWT localement.
 * Aucun appel réseau — lecture et décodage base64 purs.
 *
 * @supabase/ssr 0.5.x stocke la session sous la forme :
 *   - Cookie unique  : value = JSON brut (si len(URL-encoded) ≤ 3180)
 *   - Cookies multiples : sb-<ref>-auth-token.0, .1 … → parties du JSON brut jointes
 *   - Optionnel      : value = "base64-<base64url(json)>" si cookieEncoding:"base64url"
 */
function lireSession(request: NextRequest): SessionInfo {
  const authCookies = request.cookies
    .getAll()
    .filter((c) => /^sb-.+-auth-token/.test(c.name) && c.value)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (authCookies.length === 0) return { cookiePresent: false, payload: null }

  try {
    let raw = authCookies.map((c) => c.value).join('')

    // Support du format base64url (cookieEncoding: 'base64url')
    if (raw.startsWith('base64-')) {
      raw = atob(raw.slice(7).replace(/-/g, '+').replace(/_/g, '/'))
    }

    // Les valeurs peuvent être URL-encodées
    try { raw = decodeURIComponent(raw) } catch { /* non URL-encoded, on garde tel quel */ }

    const session = JSON.parse(raw) as { access_token?: string }
    const token = session.access_token
    if (!token) return { cookiePresent: true, payload: null }

    const b64 = token.split('.')[1]
    if (!b64) return { cookiePresent: true, payload: null }

    const payload = JSON.parse(
      atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
    ) as JwtPayload

    // Token expiré → cookiePresent = true mais payload = null
    // Le client Supabase côté navigateur renouvellera le token automatiquement
    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      return { cookiePresent: true, payload: null }
    }

    return { cookiePresent: true, payload }
  } catch {
    // Cookie présent mais illisible → on considère l'utilisateur comme connecté
    // pour éviter la boucle de redirection. Les pages valideront avec getUser().
    return { cookiePresent: true, payload: null }
  }
}

/**
 * Protège les routes et gère le routing selon le profil de l'utilisateur.
 * Toutes les décisions sont basées sur le JWT local (zéro réseau).
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

  const { cookiePresent, payload } = lireSession(request)
  const userId = payload?.sub ?? null
  const meta = (payload?.user_metadata ?? {}) as Record<string, unknown>

  // Pas de cookie → non connecté → /login (sauf routes publiques et API)
  if (!cookiePresent && !estRoutePublique && !estRouteApi) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Cookie présent mais payload illisible (token expiré ou format inattendu) :
  // on laisse passer vers la page. La page appellera getUser() et redirigera
  // si nécessaire. Pas de boucle de redirection.
  if (cookiePresent && !userId) {
    // Exception : éviter d'atterrir sur /login si on est déjà connecté
    if (estRoutePublique) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
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

    // /admin → seul appel DB restant (route rare, uniquement pour les super-admins)
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
