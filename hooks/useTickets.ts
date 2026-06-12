'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import type { StatutTicket, Ticket } from '@/types'

export type FiltreTickets = 'tous' | 'prets' | 'en_cours' | 'non_payes'

interface UseTicketsResult {
  tickets: Ticket[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/**
 * Liste des tickets (affichage instantané via cache).
 * Accepte un pressing ou plusieurs (vue globale du tableau de bord).
 */
export function useTickets(
  pressingIds: string | string[] | null,
  filtre: FiltreTickets
): UseTicketsResult {
  const ids = pressingIds === null ? [] : Array.isArray(pressingIds) ? pressingIds : [pressingIds]

  const { donnees, chargement, erreur, recharger } = useDonneesCachees<Ticket[]>(
    ids.length > 0 ? `tickets_${ids.join('_')}_${filtre}` : null,
    async () => {
      const supabase = createClient()
      let requete = supabase
        .from('tickets')
        .select('*, client:clients(*), articles:articles_ticket(*)')
        .in('pressing_id', ids)
        .order('date_depot', { ascending: false })
        .limit(200)

      if (filtre === 'prets') {
        requete = requete.eq('statut', 'pret')
      } else if (filtre === 'en_cours') {
        requete = requete.in('statut', ['nouveau', 'en_traitement'])
      }

      const { data, error } = await requete
      if (error) throw error

      let resultat = (data ?? []) as Ticket[]
      if (filtre === 'non_payes') {
        resultat = resultat.filter(
          (t) => t.statut !== 'annule' && t.montant_paye < t.montant_total
        )
      }
      return resultat
    },
    'Impossible de charger les tickets. Vérifiez votre réseau.'
  )

  return { tickets: donnees ?? [], chargement, erreur, recharger }
}

interface UseTicketResult {
  ticket: Ticket | null
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/** Détail d'un ticket avec client et articles (affichage instantané via cache). */
export function useTicket(ticketId: string): UseTicketResult {
  const { donnees, chargement, erreur, recharger } = useDonneesCachees<Ticket>(
    `ticket_${ticketId}`,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tickets')
        .select('*, client:clients(*), articles:articles_ticket(*)')
        .eq('id', ticketId)
        .maybeSingle()
      if (error || !data) throw error ?? new Error('introuvable')
      return data as Ticket
    },
    'Ticket introuvable.'
  )

  return { ticket: donnees, chargement, erreur, recharger }
}

/** Change le statut d'un ticket. Retourne un message d'erreur ou null. */
export async function changerStatutTicket(
  ticketId: string,
  statut: StatutTicket
): Promise<string | null> {
  const supabase = createClient()
  const maj: Record<string, unknown> = { statut }
  if (statut === 'recupere') {
    maj.date_recuperation = new Date().toISOString()
  }
  const { error } = await supabase.from('tickets').update(maj).eq('id', ticketId)
  return error ? 'Le changement de statut a échoué. Réessayez.' : null
}
