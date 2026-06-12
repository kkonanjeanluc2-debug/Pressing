'use client'

import { createClient } from '@/lib/supabase/client'
import type { Client, Ticket } from '@/types'
import { useCallback, useEffect, useState } from 'react'

interface UseClientsResult {
  clients: Client[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/** Liste alphabétique des clients du pressing. */
export function useClients(pressingId: string | null): UseClientsResult {
  const [clients, setClients] = useState<Client[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!pressingId) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('pressing_id', pressingId)
      .order('nom', { ascending: true })

    if (error) {
      setErreur('Impossible de charger les clients. Vérifiez votre réseau.')
    } else {
      setClients((data ?? []) as Client[])
      setErreur(null)
    }
    setChargement(false)
  }, [pressingId])

  useEffect(() => {
    void charger()
  }, [charger])

  return { clients, chargement, erreur, recharger: charger }
}

interface UseClientResult {
  client: Client | null
  tickets: Ticket[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/** Fiche client : coordonnées + historique des tickets. */
export function useClient(clientId: string): UseClientResult {
  const [client, setClient] = useState<Client | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const supabase = createClient()
    const [clientRes, ticketsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase
        .from('tickets')
        .select('*, articles:articles_ticket(*)')
        .eq('client_id', clientId)
        .order('date_depot', { ascending: false }),
    ])

    if (clientRes.error || !clientRes.data) {
      setErreur('Client introuvable.')
    } else {
      setClient(clientRes.data as Client)
      setTickets((ticketsRes.data ?? []) as Ticket[])
      setErreur(null)
    }
    setChargement(false)
  }, [clientId])

  useEffect(() => {
    void charger()
  }, [charger])

  return { client, tickets, chargement, erreur, recharger: charger }
}

/** Recherche de clients par téléphone ou nom (autocomplete). */
export async function rechercherClients(
  pressingId: string,
  saisie: string
): Promise<Client[]> {
  if (saisie.trim().length < 2) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('pressing_id', pressingId)
    .or(`telephone.ilike.%${saisie}%,nom.ilike.%${saisie}%`)
    .limit(6)
  return (data ?? []) as Client[]
}
