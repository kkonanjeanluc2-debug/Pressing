'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import type { Pressing } from '@/types'

interface UsePressingResult {
  /** Premier pressing (pratique quand il n'y en a qu'un — cas de l'agent) */
  pressing: Pressing | null
  /** Tous les pressings visibles : tous ceux du propriétaire, ou celui de l'agent */
  pressings: Pressing[]
  chargement: boolean
  erreur: string | null
  recharger: () => void
}

/**
 * Charge les pressings visibles par l'utilisateur connecté
 * (affichage instantané via cache). Le propriétaire voit tous ses
 * pressings ; un agent ne voit que le sien (RLS).
 */
export function usePressing(): UsePressingResult {
  const { donnees, chargement, erreur, recharger } = useDonneesCachees<Pressing[]>(
    'pressings',
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('pressings')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Pressing[]
    },
    'Impossible de charger votre pressing. Vérifiez votre réseau.'
  )

  const pressings = donnees ?? []

  return {
    pressing: pressings[0] ?? null,
    pressings,
    chargement,
    erreur,
    recharger: () => void recharger(),
  }
}
