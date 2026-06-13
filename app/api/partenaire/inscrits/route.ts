import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface InscritPartenaire {
  user_id: string
  nom: string
  email: string
  type_compte: string
  created_at: string
  plan: string
  abonnement_expire_le: string | null
  montant_total: number
}

export interface DashboardPartenaire {
  taux_commission: number
  code_parrainage: string
  nb_inscrits: number
  ca_total: number
  commission_estimee: number
  inscrits: InscritPartenaire[]
}

/** GET — tableau de bord du partenaire connecté */
export async function GET(): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ succes: false, erreur: 'Non authentifié' }, { status: 401 })

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  // 1. Récupérer le partenaire connecté
  const { data: partenaire } = await admin
    .from('partenaires')
    .select('id, code_parrainage, taux_commission')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!partenaire) {
    return NextResponse.json({ succes: false, erreur: 'Compte partenaire introuvable.' }, { status: 404 })
  }

  // 2. Profils des utilisateurs parrainés (comparaison insensible à la casse)
  const { data: profils } = await admin
    .from('profils')
    .select('user_id, nom, type_compte, created_at')
    .eq('parraine_par', (partenaire.code_parrainage as string).toLowerCase())

  const profils_ = profils ?? []
  const userIds = profils_.map((p) => p.user_id as string)

  // 3. Abonnements actifs + historique des paiements
  const [{ data: abosActifs }, { data: paiements }] = await Promise.all([
    admin
      .from('abonnements')
      .select('owner_id, plan, expire_le')
      .in('owner_id', userIds.length > 0 ? userIds : ['_vide_'])
      .eq('statut', 'actif'),
    admin
      .from('abonnements')
      .select('owner_id, montant')
      .in('owner_id', userIds.length > 0 ? userIds : ['_vide_'])
      .not('montant', 'is', null),
  ])

  // 4. Emails via auth.users (admin)
  const emailParUserId: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of users?.users ?? []) {
      if (userIds.includes(u.id)) emailParUserId[u.id] = u.email ?? ''
    }
  }

  // 5. Agréger par utilisateur
  const montantParUser: Record<string, number> = {}
  for (const p of paiements ?? []) {
    const uid = p.owner_id as string
    montantParUser[uid] = (montantParUser[uid] ?? 0) + (p.montant as number)
  }

  const planParUser: Record<string, string> = {}
  const expireParUser: Record<string, string | null> = {}
  for (const a of abosActifs ?? []) {
    planParUser[a.owner_id as string] = a.plan as string
    expireParUser[a.owner_id as string] = a.expire_le as string | null
  }

  const inscrits: InscritPartenaire[] = profils_.map((p) => ({
    user_id: p.user_id as string,
    nom: p.nom as string,
    email: emailParUserId[p.user_id as string] ?? '',
    type_compte: p.type_compte as string,
    created_at: p.created_at as string,
    plan: planParUser[p.user_id as string] ?? 'gratuit',
    abonnement_expire_le: expireParUser[p.user_id as string] ?? null,
    montant_total: montantParUser[p.user_id as string] ?? 0,
  }))

  const ca_total = inscrits.reduce((s, i) => s + i.montant_total, 0)
  const commission_estimee = Math.round(ca_total * (partenaire.taux_commission / 100))

  const dashboard: DashboardPartenaire = {
    taux_commission: partenaire.taux_commission as number,
    code_parrainage: partenaire.code_parrainage as string,
    nb_inscrits: inscrits.length,
    ca_total,
    commission_estimee,
    inscrits,
  }

  return NextResponse.json({ succes: true, dashboard })
}
