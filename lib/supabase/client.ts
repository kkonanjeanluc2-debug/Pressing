'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (client) return client
  // Fallback vide pour éviter un crash au rendu si les vars ne sont pas encore
  // intégrées dans le bundle (build sans env vars). Les appels Supabase
  // échoueront proprement, mais l'app ne plantera pas.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  client = createBrowserClient(url, key)
  return client
}
