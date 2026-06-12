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

async function chargerDashboard(pressingId: string): Promise<DonneesDashboard> {
  const supabase = createClient()

  const maintenant = new Date()
  const debutAujourdhui = debutJour(maintenant)
  const debutSemaine = debutJour(new Date(maintenant.getTime() - 6 * 86400_000))
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
  const debut4Semaines = debutJour(new Date(maintenant.getTime() - 27 * 86400_000))

  const [actifs, prets, clients, ticketsCreance, encaissements, pretsAnciens] =
    await Promise.all([
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('pressing_id', pressingId)
        .in('statut', ['nouveau', 'en_traitement', 'pret']),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('pressing_id', pressingId)
        .eq('statut', 'pret'),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('pressing_id', pressingId),
      supabase
        .from('tickets')
        .select('montant_total, montant_paye')
        .eq('pressing_id', pressingId)
        .neq('statut', 'annule'),
      supabase
        .from('encaissements')
        .select('montant, created_at')
        .eq('pressing_id', pressingId)
        .gte('created_at', debut4Semaines.toISOString()),
      supabase
        .from('tickets')
        .select('*, client:clients(*)')
        .eq('pressing_id', pressingId)
        .eq('statut', 'pret')
        .eq('sms_envoye', false)
        .lt('created_at', new Date(Date.now() - 24 * 3600_000).toISOString()),
    ])

  const premiereErreur =
    actifs.error ?? prets.error ?? clients.error ?? ticketsCreance.error ??
    encaissements.error ?? pretsAnciens.error
  if (premiereErreur) throw premiereErreur

  const lignesCreance = (ticketsCreance.data ?? []) as Array<{
    montant_total: number
    montant_paye: number
  }>
  const creancesTotal = lignesCreance.reduce(
    (somme, t) => somme + Math.max(0, t.montant_total - t.montant_paye),
    0
  )

  const lignesEnc = (encaissements.data ?? []) as Array<{
    montant: number
    created_at: string
  }>

  const sommeDepuis = (depuis: Date): number =>
    lignesEnc
      .filter((e) => new Date(e.created_at) >= depuis)
      .reduce((s, e) => s + e.montant, 0)

  // CA des 4 dernières semaines (barres du mini graphique)
  const semaines: SemaineCA[] = []
  for (let i = 3; i >= 0; i--) {
    const debut = debutJour(new Date(maintenant.getTime() - (i * 7 + 6) * 86400_000))
    const fin = new Date(
      debutJour(new Date(maintenant.getTime() - i * 7 * 86400_000)).getTime() + 86400_000
    )
    const montant = lignesEnc
      .filter((e) => {
        const d = new Date(e.created_at)
        return d >= debut && d < fin
      })
      .reduce((s, e) => s + e.montant, 0)
    semaines.push({ semaine: i === 0 ? 'Cette sem.' : `S-${i}`, montant })
  }

  return {
    stats: {
      tickets_actifs: actifs.count ?? 0,
      tickets_prets: prets.count ?? 0,
      ca_jour: sommeDepuis(debutAujourdhui),
      ca_semaine: sommeDepuis(debutSemaine),
      ca_mois: sommeDepuis(debutMois),
      creances_total: creancesTotal,
      clients_total: clients.count ?? 0,
    },
    caParSemaine: semaines,
    ticketsPretsNonNotifies: (pretsAnciens.data ?? []) as Ticket[],
  }
}

/**
 * Statistiques du tableau de bord : affichage instantané via cache,
 * rafraîchissement en arrière-plan + temps réel (Supabase Realtime).
 */
export function useDashboard(pressingId: string | null): UseDashboardResult {
  const { donnees, chargement, erreur, recharger } = useDonneesCachees<DonneesDashboard>(
    pressingId ? `dashboard_${pressingId}` : null,
    () => chargerDashboard(pressingId as string),
    'Impossible de charger le tableau de bord. Vérifiez votre réseau.'
  )

  // Temps réel : recharge les stats à chaque changement sur les tickets
  useEffect(() => {
    if (!pressingId) return
    const supabase = createClient()
    const canal = supabase
      .channel(`dashboard-${pressingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `pressing_id=eq.${pressingId}`,
        },
        () => void recharger()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [pressingId, recharger])

  return {
    stats: donnees?.stats ?? null,
    caParSemaine: donnees?.caParSemaine ?? [],
    ticketsPretsNonNotifies: donnees?.ticketsPretsNonNotifies ?? [],
    chargement,
    erreur,
    recharger: () => void recharger(),
  }
}
