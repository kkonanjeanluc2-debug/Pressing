'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import type { Agent, PermissionsAgent } from '@/types'
import { useCallback } from 'react'

export type Role = 'proprietaire' | 'agent'

interface Profil {
  role: Role
  agent: Agent | null
}

interface UseProfilResult {
  role: Role
  agent: Agent | null
  chargement: boolean
  /** L'utilisateur a-t-il le droit de faire cette action ? (propriétaire : toujours oui) */
  peut: (permission: keyof PermissionsAgent) => boolean
}

/**
 * Rôle de l'utilisateur connecté : propriétaire du compte ou agent
 * rattaché à un pressing (avec ses permissions).
 */
export function useProfil(): UseProfilResult {
  const { donnees, chargement } = useDonneesCachees<Profil>(
    'profil',
    async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { role: 'proprietaire', agent: null }

      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        return { role: 'agent', agent: data as Agent }
      }
      return { role: 'proprietaire', agent: null }
    },
    'Impossible de charger votre profil.'
  )

  const role: Role = donnees?.role ?? 'proprietaire'
  const agent = donnees?.agent ?? null

  const peut = useCallback(
    (permission: keyof PermissionsAgent): boolean => {
      if (role === 'proprietaire') return true
      if (!agent || !agent.actif) return false
      return agent.permissions[permission] === true
    },
    [role, agent]
  )

  return { role, agent, chargement, peut }
}
