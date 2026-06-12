'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import type { Pressing } from '@/types'
import { useMemo } from 'react'

export interface ResumePressing {
  pressing: Pressing
  /** Encaissements du jour (FCFA) */
  ca_jour: number
  /** Dépôts créés aujourd'hui */
  depots_jour: number
  /** Créances en cours (FCFA) */
  creances: number
  /** Tickets nouveaux / en traitement / prêts */
  tickets_actifs: number
}

interface UsePressingsResumeResult {
  resumes: ResumePressing[]
  totalCaJour: number
  totalCreances: number
  chargement: boolean
}

/**
 * Vue d'ensemble chiffrée de tous les pressings du propriétaire
 * (affichage instantané via cache, rafraîchissement en arrière-plan).
 */
export function usePressingsResume(pressings: Pressing[]): UsePressingsResumeResult {
  const cle = pressings.length > 0 ? `resume_${pressings.map((p) => p.id).join('_')}` : null

  const { donnees, chargement } = useDonneesCachees<ResumePressing[]>(
    cle,
    async () => {
      const supabase = createClient()
      const ids = pressings.map((p) => p.id)
      const debutJour = new Date()
      debutJour.setHours(0, 0, 0, 0)

      const [enc, tickets] = await Promise.all([
        supabase
          .from('encaissements')
          .select('pressing_id, montant')
          .in('pressing_id', ids)
          .gte('created_at', debutJour.toISOString()),
        supabase
          .from('tickets')
          .select('pressing_id, montant_total, montant_paye, statut, created_at')
          .in('pressing_id', ids)
          .neq('statut', 'annule'),
      ])
      if (enc.error || tickets.error) throw enc.error ?? tickets.error

      const lignesEnc = (enc.data ?? []) as Array<{ pressing_id: string; montant: number }>
      const lignesTickets = (tickets.data ?? []) as Array<{
        pressing_id: string
        montant_total: number
        montant_paye: number
        statut: string
        created_at: string
      }>

      return pressings.map((pressing) => {
        const encPressing = lignesEnc.filter((e) => e.pressing_id === pressing.id)
        const ticketsPressing = lignesTickets.filter((t) => t.pressing_id === pressing.id)
        return {
          pressing,
          ca_jour: encPressing.reduce((s, e) => s + e.montant, 0),
          depots_jour: ticketsPressing.filter((t) => new Date(t.created_at) >= debutJour).length,
          creances: ticketsPressing.reduce(
            (s, t) => s + Math.max(0, t.montant_total - t.montant_paye),
            0
          ),
          tickets_actifs: ticketsPressing.filter((t) =>
            ['nouveau', 'en_traitement', 'pret'].includes(t.statut)
          ).length,
        }
      })
    },
    'Impossible de charger le résumé des pressings.'
  )

  const resumes = donnees ?? []
  const totalCaJour = useMemo(() => resumes.reduce((s, r) => s + r.ca_jour, 0), [resumes])
  const totalCreances = useMemo(() => resumes.reduce((s, r) => s + r.creances, 0), [resumes])

  return { resumes, totalCaJour, totalCreances, chargement }
}
