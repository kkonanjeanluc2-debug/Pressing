import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import type { UtilisateurAdmin } from '@/types'
import { NextResponse, type NextRequest } from 'next/server'

function estActif(bannedUntil: string | null | undefined, meta: Record<string, unknown> | null): boolean {
  // Notre flag explicite (source de vérité principale)
  if (meta?.compte_actif === false) return false
  // Fallback : ban_duration Supabase pour les comptes bannis avant ce système
  if (bannedUntil && new Date(bannedUntil) > new Date()) return false
  return true
}

/** GET /api/admin/utilisateurs — tous les comptes propriétaires. */
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

  const [profils, pressings, abonnements, comptes] = await Promise.all([
    admin.from('profils').select('*').order('created_at', { ascending: false }),
    admin.from('pressings').select('owner_id'),
    admin.from('abonnements').select('owner_id, plan').eq('statut', 'actif'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const compteMap = new Map(
    (comptes.data?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email ?? '',
        banned_until: u.banned_until ?? null,
        meta: (u.user_metadata as Record<string, unknown> | null) ?? null,
      },
    ])
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
  ).map((p) => {
    const compte = compteMap.get(p.user_id)
    return {
      user_id: p.user_id,
      nom: p.nom,
      type_compte: p.type_compte,
      email: compte?.email ?? '',
      telephone: p.telephone,
      created_at: p.created_at,
      nb_pressings: nbPressings.get(p.user_id) ?? 0,
      plan: plans.get(p.user_id) ?? 'gratuit',
      actif: estActif(compte?.banned_until, compte?.meta ?? null),
    }
  })

  return NextResponse.json({ succes: true, utilisateurs })
}

/** PATCH /api/admin/utilisateurs — activer ou désactiver un compte. */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const body = (await request.json()) as { user_id?: string; actif?: boolean }
  if (!body.user_id || typeof body.actif !== 'boolean') {
    return NextResponse.json({ succes: false, erreur: 'user_id et actif requis' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  // Stocker l'état actif dans user_metadata : c'est ce champ que le middleware
  // lit via getUser() pour bloquer immédiatement l'accès sans attendre
  // l'expiration du JWT. ban_duration reste en complément pour bloquer
  // les nouvelles connexions côté Supabase Auth.
  const { error } = await admin.auth.admin.updateUserById(body.user_id, {
    ban_duration: body.actif ? 'none' : '876000h',
    user_metadata: { compte_actif: body.actif },
  })

  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  return NextResponse.json({ succes: true })
}

/** DELETE /api/admin/utilisateurs?id=... — supprimer définitivement un compte. */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const userId = request.nextUrl.searchParams.get('id')
  if (!userId) {
    return NextResponse.json({ succes: false, erreur: 'id requis' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  // La suppression du compte auth supprime en cascade les profils, pressings, etc.
  // (si les FK on delete cascade sont configurées en base)
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  return NextResponse.json({ succes: true })
}
