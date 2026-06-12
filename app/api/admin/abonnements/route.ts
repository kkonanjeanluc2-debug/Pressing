import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import type { AbonnementAdmin } from '@/types'

/** GET /api/admin/abonnements — historique des abonnements de la plateforme. */
export async function GET(): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const admin = createAdminClient()
  const [abonnements, profils] = await Promise.all([
    admin
      .from('abonnements')
      .select('id, owner_id, plan, statut, montant, date_debut, date_fin, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    admin.from('profils').select('user_id, nom'),
  ])

  const noms = new Map(
    ((profils.data ?? []) as Array<{ user_id: string; nom: string }>).map((p) => [
      p.user_id,
      p.nom,
    ])
  )

  const resultat: AbonnementAdmin[] = (
    (abonnements.data ?? []) as Array<{
      id: string
      owner_id: string | null
      plan: string
      statut: string
      montant: number | null
      date_debut: string | null
      date_fin: string | null
      created_at: string
    }>
  ).map((a) => ({
    id: a.id,
    plan: a.plan,
    statut: a.statut,
    montant: a.montant,
    date_debut: a.date_debut,
    date_fin: a.date_fin,
    created_at: a.created_at,
    proprietaire: (a.owner_id ? noms.get(a.owner_id) : null) ?? '—',
  }))

  return NextResponse.json({ succes: true, abonnements: resultat })
}
