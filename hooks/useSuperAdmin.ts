'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'

/** L'utilisateur connecté est-il super administrateur de la plateforme ? */
export function useSuperAdmin(): { estAdmin: boolean; chargement: boolean } {
  const { donnees, chargement } = useDonneesCachees<{ admin: boolean }>(
    'super_admin',
    async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { admin: false }
      const { data } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      return { admin: data !== null }
    },
    'Vérification administrateur impossible.'
  )

  return { estAdmin: donnees?.admin === true, chargement }
}
