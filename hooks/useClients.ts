'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import type { Client, Ticket } from '@/types'

interface UseClientsResult {
  clients: Client[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/**
 * Liste alphabétique des clients (affichage instantané via cache).
 * Accepte un pressing ou plusieurs (vue globale du propriétaire).
 */
export function useClients(pressingIds: string | string[] | null): UseClientsResult {
  const ids = pressingIds === null ? [] : Array.isArray(pressingIds) ? pressingIds : [pressingIds]

  const { donnees, chargement, erreur, recharger } = useDonneesCachees<Client[]>(
    ids.length > 0 ? `clients_${ids.join('_')}` : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('pressing_id', ids)
        .order('nom', { ascending: true })
      if (error) throw error
      return (data ?? []) as Client[]
    },
    'Impossible de charger les clients. Vérifiez votre réseau.'
  )

  return { clients: donnees ?? [], chargement, erreur, recharger }
}

interface DonneesClient {
  client: Client
  tickets: Ticket[]
}

interface UseClientResult {
  client: Client | null
  tickets: Ticket[]
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/** Fiche client : coordonnées + historique (affichage instantané via cache). */
export function useClient(clientId: string): UseClientResult {
  const { donnees, chargement, erreur, recharger } = useDonneesCachees<DonneesClient>(
    `client_${clientId}`,
    async () => {
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
        throw clientRes.error ?? new Error('introuvable')
      }
      return {
        client: clientRes.data as Client,
        tickets: (ticketsRes.data ?? []) as Ticket[],
      }
    },
    'Client introuvable.'
  )

  return {
    client: donnees?.client ?? null,
    tickets: donnees?.tickets ?? [],
    chargement,
    erreur,
    recharger,
  }
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
