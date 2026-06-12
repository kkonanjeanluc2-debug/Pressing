import { createClient } from '@/lib/supabase/server'

/** Vérifie que l'appelant est super administrateur (côté serveur). */
export async function verifierSuperAdmin(): Promise<boolean> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data !== null
}
