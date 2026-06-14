import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROUTES_PUBLIQUES = ['/login', '/register', '/landing']

/**
 * Rafraîchit la session Supabase et protège les routes du dashboard.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Garde-fou : si les variables Supabase ne sont pas configurées (ex. preview
  // Vercel sans env vars), on laisse passer sans planter le middleware.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

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
  const estRoutePartenaire = pathname.startsWith('/partenaire')
  const estRouteAdmin = pathname.startsWith('/admin')

  // Non connecté → redirection vers /login (sauf routes publiques et API)
  if (!user && !estRoutePublique && !estRouteApi) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Détecter un partenaire : d'abord via les métadonnées (rapide, sans DB),
    // sinon via la table partenaires (fallback pour comptes antérieurs sans role).
    let estPartenaire = user.user_metadata?.role === 'partenaire'

    if (!estPartenaire && !estRouteApi) {
      const { data } = await supabase
        .from('partenaires')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      estPartenaire = data !== null
    }

    if (estPartenaire) {
      // Partenaire → toujours vers l'espace /partenaire
      if (!estRoutePartenaire && !estRouteApi) {
        const url = request.nextUrl.clone()
        url.pathname = '/partenaire'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Utilisateur ordinaire connecté → pas d'accès aux pages login/register
    if (estRoutePublique) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Utilisateur ordinaire connecté → pas d'accès à l'espace partenaire
    if (estRoutePartenaire) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Utilisateur ordinaire → vérifier super-admin pour accéder à /admin
    if (estRouteAdmin) {
      const { data: adminRow } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!adminRow) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
