import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface StatsAdmin {
  comptes: { total: number; entreprises: number; personnes: number }
  pressings: { total: number; ouverts: number }
  agents: { total: number; actifs: number }
  tickets: { total: number; mois: number }
  /** Volume encaissé par les pressings ce mois (FCFA) */
  volume_mois: number
  abonnements: {
    gratuit: number
    pro: number
    reseau: number
    /** Revenu mensuel récurrent des abonnements payants actifs */
    mrr: number
    /** Total historique des paiements d'abonnements */
    revenus_total: number
  }
  derniers_comptes: Array<{ nom: string; type_compte: string; created_at: string }>
}

/**
 * GET /api/admin/stats — statistiques globales de la plateforme.
 * Réservé aux super administrateurs (table super_admins).
 */
export async function GET(): Promise<NextResponse> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ succes: false, erreur: 'Non connecté' }, { status: 401 })
  }

  // Vérification du droit super admin (RLS : chacun ne voit que sa ligne)
  const { data: estAdmin } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!estAdmin) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const admin = createAdminClient()
  const debutMois = new Date()
  debutMois.setDate(1)
  debutMois.setHours(0, 0, 0, 0)

  const [
    profils,
    pressingsTotal,
    pressingsOuverts,
    agentsTotal,
    agentsActifs,
    ticketsTotal,
    ticketsMois,
    encaissementsMois,
    abonnementsActifs,
    abonnementsPayes,
    derniersComptes,
  ] = await Promise.all([
    admin.from('profils').select('type_compte'),
    admin.from('pressings').select('id', { count: 'exact', head: true }),
    admin.from('pressings').select('id', { count: 'exact', head: true }).eq('ouvert', true),
    admin.from('agents').select('id', { count: 'exact', head: true }),
    admin.from('agents').select('id', { count: 'exact', head: true }).eq('actif', true),
    admin.from('tickets').select('id', { count: 'exact', head: true }),
    admin
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', debutMois.toISOString()),
    admin.from('encaissements').select('montant').gte('created_at', debutMois.toISOString()),
    admin
      .from('abonnements')
      .select('plan')
      .eq('statut', 'actif'),
    admin.from('abonnements').select('montant').not('montant', 'is', null),
    admin
      .from('profils')
      .select('nom, type_compte, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const lignesProfils = (profils.data ?? []) as Array<{ type_compte: string }>
  const entreprises = lignesProfils.filter((p) => p.type_compte === 'entreprise').length

  const plansActifs = (abonnementsActifs.data ?? []) as Array<{ plan: string }>
  const nbPro = plansActifs.filter((a) => a.plan === 'pro').length
  const nbReseau = plansActifs.filter((a) => a.plan === 'reseau').length
  const nbGratuit = plansActifs.filter((a) => a.plan === 'gratuit').length

  const stats: StatsAdmin = {
    comptes: {
      total: lignesProfils.length,
      entreprises,
      personnes: lignesProfils.length - entreprises,
    },
    pressings: { total: pressingsTotal.count ?? 0, ouverts: pressingsOuverts.count ?? 0 },
    agents: { total: agentsTotal.count ?? 0, actifs: agentsActifs.count ?? 0 },
    tickets: { total: ticketsTotal.count ?? 0, mois: ticketsMois.count ?? 0 },
    volume_mois: ((encaissementsMois.data ?? []) as Array<{ montant: number }>).reduce(
      (s, e) => s + e.montant,
      0
    ),
    abonnements: {
      gratuit: nbGratuit,
      pro: nbPro,
      reseau: nbReseau,
      mrr: nbPro * 5000 + nbReseau * 12000,
      revenus_total: ((abonnementsPayes.data ?? []) as Array<{ montant: number }>).reduce(
        (s, a) => s + (a.montant ?? 0),
        0
      ),
    },
    derniers_comptes: ((derniersComptes.data ?? []) as Array<{
      nom: string
      type_compte: string
      created_at: string
    }>),
  }

  return NextResponse.json({ succes: true, stats })
}
