'use client'

import { createClient } from '@/lib/supabase/client'
import type { StatutTicket, Ticket } from '@/types'
import { useCallback, useEffect, useState } from 'react'

export type FiltreTickets = 'tous' | 'prets' | 'en_cours' | 'non_payes'

interface UseTicketsResult {
  tickets: Ticket[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/** Liste des tickets du pressing avec articles et client joints. */
export function useTickets(pressingId: string | null, filtre: FiltreTickets): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!pressingId) return
    const supabase = createClient()

    let requete = supabase
      .from('tickets')
      .select('*, client:clients(*), articles:articles_ticket(*)')
      .eq('pressing_id', pressingId)
      .order('date_depot', { ascending: false })
      .limit(200)

    if (filtre === 'prets') {
      requete = requete.eq('statut', 'pret')
    } else if (filtre === 'en_cours') {
      requete = requete.in('statut', ['nouveau', 'en_traitement'])
    }

    const { data, error } = await requete

    if (error) {
      setErreur('Impossible de charger les tickets. Vérifiez votre réseau.')
    } else {
      let resultat = (data ?? []) as Ticket[]
      if (filtre === 'non_payes') {
        resultat = resultat.filter(
          (t) => t.statut !== 'annule' && t.montant_paye < t.montant_total
        )
      }
      setTickets(resultat)
      setErreur(null)
    }
    setChargement(false)
  }, [pressingId, filtre])

  useEffect(() => {
    setChargement(true)
    void charger()
  }, [charger])

  return { tickets, chargement, erreur, recharger: charger }
}

interface UseTicketResult {
  ticket: Ticket | null
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/** Détail d'un ticket avec client et articles. */
export function useTicket(ticketId: string): UseTicketResult {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tickets')
      .select('*, client:clients(*), articles:articles_ticket(*)')
      .eq('id', ticketId)
      .maybeSingle()

    if (error || !data) {
      setErreur('Ticket introuvable.')
    } else {
      setTicket(data as Ticket)
      setErreur(null)
    }
    setChargement(false)
  }, [ticketId])

  useEffect(() => {
    void charger()
  }, [charger])

  return { ticket, chargement, erreur, recharger: charger }
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
