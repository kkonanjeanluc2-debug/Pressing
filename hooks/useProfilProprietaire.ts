'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import type { ProfilProprietaire } from '@/types'

interface Resultat {
  proprietaire: ProfilProprietaire | null
  chargement: boolean
}

/**
 * Profil du propriétaire d'un pressing (raison sociale / nom, RCCM, NCC).
 * Lisible aussi par les agents : utilisé pour les en-têtes de documents.
 */
export function useProfilProprietaire(ownerId: string | null): Resultat {
  const { donnees, chargement } = useDonneesCachees<{ profil: ProfilProprietaire | null }>(
    ownerId ? `profil_prop_${ownerId}` : null,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profils')
        .select('*')
        .eq('user_id', ownerId as string)
        .maybeSingle()
      return { profil: (data as ProfilProprietaire | null) ?? null }
    },
    'Impossible de charger le profil du propriétaire.'
  )

  return { proprietaire: donnees?.profil ?? null, chargement }
}
