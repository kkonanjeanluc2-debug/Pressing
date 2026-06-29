'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import type { Plan } from '@/types'

interface PlanResult {
  plan: Plan
  date_fin: string | null
  chargement: boolean
  /** Le plan actif autorise-t-il la fonctionnalité demandée ? */
  planAutorise: (planMinimum: Plan) => boolean
}

const ORDRE: Plan[] = ['gratuit', 'pro', 'business', 'reseau']

/**
 * Plan actif du propriétaire identifié par `ownerId`.
 * Si `ownerId` est null, on résout via l'utilisateur connecté.
 */
export function usePlan(ownerId: string | null): PlanResult {
  const { donnees, chargement } = useDonneesCachees<{ plan: Plan; date_fin: string | null }>(
    ownerId ? `plan_${ownerId}` : null,
    async () => {
      const supabase = createClient()
      if (!ownerId) return { plan: 'gratuit', date_fin: null }
      const { data } = await supabase
        .from('abonnements')
        .select('plan, date_fin')
        .eq('owner_id', ownerId)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return {
        plan: (data?.plan as Plan | null) ?? 'gratuit',
        date_fin: (data?.date_fin as string | null) ?? null,
      }
    },
    'Impossible de charger le plan.'
  )

  const plan: Plan = donnees?.plan ?? 'gratuit'
  const date_fin = donnees?.date_fin ?? null

  function planAutorise(planMinimum: Plan): boolean {
    return ORDRE.indexOf(plan) >= ORDRE.indexOf(planMinimum)
  }

  return { plan, date_fin, chargement, planAutorise }
}
