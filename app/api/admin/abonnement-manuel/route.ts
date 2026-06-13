import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** POST /api/admin/abonnement-manuel — attribue un abonnement gratuit à un utilisateur. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const { owner_id, plan, jours } = (await request.json()) as {
    owner_id: string
    plan: string
    jours: number
  }

  if (!owner_id || !plan || !jours || jours < 1) {
    return NextResponse.json({ succes: false, erreur: 'Paramètres invalides' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const now = new Date()
  const date_fin = new Date(now.getTime() + jours * 24 * 60 * 60 * 1000)

  // Expirer les abonnements actifs existants
  await admin
    .from('abonnements')
    .update({ statut: 'expire' })
    .eq('owner_id', owner_id)
    .eq('statut', 'actif')

  const { error } = await admin.from('abonnements').insert({
    owner_id,
    plan,
    statut: 'actif',
    montant: 0,
    date_debut: now.toISOString(),
    date_fin: date_fin.toISOString(),
  })

  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  return NextResponse.json({ succes: true })
}
