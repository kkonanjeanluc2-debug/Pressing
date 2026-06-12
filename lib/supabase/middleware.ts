import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROUTES_PUBLIQUES = ['/login', '/register']

/**
 * Rafraîchit la session Supabase et protège les routes du dashboard.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // getSession lit le cookie localement (pas d'aller-retour réseau à chaque
  // navigation, contrairement à getUser). Le token n'est rafraîchi par le
  // réseau que s'il est expiré. La sécurité des données reste garantie par
  // RLS côté Supabase : ce middleware ne fait que des redirections.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const pathname = request.nextUrl.pathname
  const estRoutePublique = ROUTES_PUBLIQUES.some((r) => pathname.startsWith(r))
  const estRouteApi = pathname.startsWith('/api')

  // Non connecté → redirection vers /login (sauf routes publiques et API)
  if (!user && !estRoutePublique && !estRouteApi) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Déjà connecté → pas d'accès aux pages login/register
  if (user && estRoutePublique) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
