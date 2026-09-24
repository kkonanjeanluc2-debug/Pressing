'use client'

import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import type { DashboardStats, SemaineCA, Ticket } from '@/types'
import { useEffect } from 'react'

interface DonneesDashboard {
  stats: DashboardStats
  caParSemaine: SemaineCA[]
  ticketsPretsNonNotifies: Ticket[]
}

interface UseDashboardResult {
  stats: DashboardStats | null
  caParSemaine: SemaineCA[]
  ticketsPretsNonNotifies: Ticket[]
  chargement: boolean
  erreur: string | null
  recharger: () => void
}

function debutJour(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

async function chargerDashboard(pressingIds: string[]): Promise<DonneesDashboard> {
  const supabase = createClient()

  const maintenant = new Date()
  const debutAujourdhui = debutJour(maintenant)
  const debutSemaine = debutJour(new Date(maintenant.getTime() - 6 * 86400_000))
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
  const debut4Semaines = debutJour(new Date(maintenant.getTime() - 27 * 86400_000))

  const [actifs, prets, clients, ticketsStats, encaissJour, pretsAnciens] =
    await Promise.all([
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .in('pressing_id', pressingIds)
        .in('statut', ['nouveau', 'en_traitement', 'pret']),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .in('pressing_id', pressingIds)
        .eq('statut', 'pret'),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .in('pressing_id', pressingIds),
      // Tickets des 4 dernières semaines : pour CA facturé (mois + graphique) + créances
      supabase
        .from('tickets')
        .select('montant_total, montant_paye, date_depot, statut')
        .in('pressing_id', pressingIds)
        .gte('date_depot', debut4Semaines.toISOString()),
      // Encaissements du jour uniquement : recettes réellement encaissées aujourd'hui
      supabase
        .from('encaissements')
        .select('montant')
        .in('pressing_id', pressingIds)
        .gte('created_at', debutAujourdhui.toISOString()),
      supabase
        .from('tickets')
        .select('*, client:clients(*)')
        .in('pressing_id', pressingIds)
        .eq('statut', 'pret')
        .eq('sms_envoye', false)
        .lt('created_at', new Date(Date.now() - 24 * 3600_000).toISOString()),
    ])

  const premiereErreur =
    actifs.error ?? prets.error ?? clients.error ?? ticketsStats.error ??
    encaissJour.error ?? pretsAnciens.error
  if (premiereErreur) throw premiereErreur

  const lignesTickets = (ticketsStats.data ?? []) as Array<{
    montant_total: number
    montant_paye: number
    date_depot: string
    statut: string
  }>

  // Créances = total non payé sur tous les tickets non annulés (fenêtre 4 semaines + historique)
  // On refait une requête séparée pour les créances car on a besoin de TOUS les tickets actifs
  const { data: tousTicketsActifs } = await supabase
    .from('tickets')
    .select('montant_total, montant_paye')
    .in('pressing_id', pressingIds)
    .neq('statut', 'annule')
  const creancesTotal = ((tousTicketsActifs ?? []) as Array<{ montant_total: number; montant_paye: number }>)
    .reduce((s, t) => s + Math.max(0, t.montant_total - t.montant_paye), 0)

  // CA facturé du mois = sum(montant_total) des tickets NON annulés créés ce mois
  const caMois = lignesTickets
    .filter((t) => t.statut !== 'annule' && new Date(t.date_depot) >= debutMois)
    .reduce((s, t) => s + t.montant_total, 0)

  // Recettes du jour = encaissements réellement perçus aujourd'hui
  const recettesJour = ((encaissJour.data ?? []) as Array<{ montant: number }>)
    .reduce((s, e) => s + e.montant, 0)

  // CA facturé par semaine (4 dernières semaines) pour le graphique
  const semaines: SemaineCA[] = []
  for (let i = 3; i >= 0; i--) {
    const debut = debutJour(new Date(maintenant.getTime() - (i * 7 + 6) * 86400_000))
    const fin = new Date(
      debutJour(new Date(maintenant.getTime() - i * 7 * 86400_000)).getTime() + 86400_000
    )
    const montant = lignesTickets
      .filter((t) => {
        if (t.statut === 'annule') return false
        const d = new Date(t.date_depot)
        return d >= debut && d < fin
      })
      .reduce((s, t) => s + t.montant_total, 0)
    semaines.push({ semaine: i === 0 ? 'Cette sem.' : `S-${i}`, montant })
  }

  return {
    stats: {
      tickets_actifs: actifs.count ?? 0,
      tickets_prets: prets.count ?? 0,
      // ca_jour = recettes réellement encaissées aujourd'hui (caisse)
      ca_jour: recettesJour,
      // ca_semaine non utilisé en affichage mais gardé pour compatibilité
      ca_semaine: 0,
      // ca_mois = CA facturé ce mois (montant_total tickets, créances comprises)
      ca_mois: caMois,
      creances_total: creancesTotal,
      clients_total: clients.count ?? 0,
    },
    caParSemaine: semaines,
    ticketsPretsNonNotifies: (pretsAnciens.data ?? []) as Ticket[],
  }
}

/**
 * Statistiques du tableau de bord, agrégées sur TOUS les pressings fournis
 * (vue commune du propriétaire ; un agent n'a que son pressing).
 * Affichage instantané via cache + temps réel (Supabase Realtime).
 */
export function useDashboard(pressingIds: string[]): UseDashboardResult {
  const cleIds = pressingIds.join('_')
  const { donnees, chargement, erreur, recharger } = useDonneesCachees<DonneesDashboard>(
    pressingIds.length > 0 ? `dashboard_${cleIds}` : null,
    () => chargerDashboard(pressingIds),
    'Impossible de charger le tableau de bord. Vérifiez votre réseau.'
  )

  // Temps réel : recharge les stats à chaque changement sur les tickets
  // (RLS limite les événements aux pressings de l'utilisateur)
  useEffect(() => {
    if (pressingIds.length === 0) return
    const supabase = createClient()
    const canal = supabase
      .channel(`dashboard-${cleIds}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => void recharger()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleIds, recharger])

  return {
    stats: donnees?.stats ?? null,
    caParSemaine: donnees?.caParSemaine ?? [],
    ticketsPretsNonNotifies: donnees?.ticketsPretsNonNotifies ?? [],
    chargement,
    erreur,
    recharger: () => void recharger(),
  }
}
