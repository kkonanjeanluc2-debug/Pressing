import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import type { StatsAdmin } from '@/types'
import { NextResponse } from 'next/server'


/**
 * GET /api/admin/stats — statistiques globales de la plateforme.
 * Réservé aux super administrateurs (table super_admins).
 */
export async function GET(): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json(
      { succes: false, erreur: (e as Error).message },
      { status: 500 }
    )
  }
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
    admin.from('abonnements').select('montant').gte('created_at', debutMois.toISOString()).not('montant', 'is', null),
    admin.from('abonnements').select('plan, owner_id').eq('statut', 'actif'),
    admin.from('abonnements').select('montant').not('montant', 'is', null),
    admin
      .from('profils')
      .select('user_id, nom, type_compte, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const lignesProfils = (profils.data ?? []) as Array<{ type_compte: string }>
  const entreprises = lignesProfils.filter((p) => p.type_compte === 'entreprise').length

  const plansActifs = (abonnementsActifs.data ?? []) as Array<{ plan: string; owner_id: string }>
  const planParProprietaire = new Map(plansActifs.map((a) => [a.owner_id, a.plan]))
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
    derniers_comptes: (
      (derniersComptes.data ?? []) as Array<{
        user_id: string
        nom: string
        type_compte: string
        created_at: string
      }>
    ).map((c) => ({
      nom: c.nom,
      type_compte: c.type_compte,
      created_at: c.created_at,
      plan: planParProprietaire.get(c.user_id) ?? 'gratuit',
    })),
  }

  return NextResponse.json({ succes: true, stats })
}
