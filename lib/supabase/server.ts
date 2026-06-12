import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Client Supabase côté serveur (Server Components, Route Handlers).
 * Utilise les cookies de session de l'utilisateur connecté.
 */
export function createClient(): SupabaseClient {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Appel depuis un Server Component : les cookies sont
            // rafraîchis par le middleware, on peut ignorer.
          }
        },
      },
    }
  )
}

/**
 * Client Supabase avec la clé service role (webhooks, tâches serveur).
 * ⚠️ Ne jamais exposer côté client : bypass RLS.
 */
export function createAdminClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
