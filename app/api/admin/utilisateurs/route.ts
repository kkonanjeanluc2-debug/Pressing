import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import type { UtilisateurAdmin } from '@/types'

/** GET /api/admin/utilisateurs — tous les comptes propriétaires. */
export async function GET(): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const admin = createAdminClient()
  const [profils, pressings, abonnements, comptes] = await Promise.all([
    admin.from('profils').select('*').order('created_at', { ascending: false }),
    admin.from('pressings').select('owner_id'),
    admin.from('abonnements').select('owner_id, plan').eq('statut', 'actif'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const emails = new Map(
    (comptes.data?.users ?? []).map((u) => [u.id, u.email ?? ''])
  )
  const nbPressings = new Map<string, number>()
  for (const p of (pressings.data ?? []) as Array<{ owner_id: string }>) {
    nbPressings.set(p.owner_id, (nbPressings.get(p.owner_id) ?? 0) + 1)
  }
  const plans = new Map(
    ((abonnements.data ?? []) as Array<{ owner_id: string; plan: string }>).map((a) => [
      a.owner_id,
      a.plan,
    ])
  )

  const utilisateurs: UtilisateurAdmin[] = (
    (profils.data ?? []) as Array<{
      user_id: string
      nom: string
      type_compte: string
      telephone: string | null
      created_at: string
    }>
  ).map((p) => ({
    user_id: p.user_id,
    nom: p.nom,
    type_compte: p.type_compte,
    email: emails.get(p.user_id) ?? '',
    telephone: p.telephone,
    created_at: p.created_at,
    nb_pressings: nbPressings.get(p.user_id) ?? 0,
    plan: plans.get(p.user_id) ?? 'gratuit',
  }))

  return NextResponse.json({ succes: true, utilisateurs })
}
