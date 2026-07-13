import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** POST /api/admin/changer-mdp — définit directement un nouveau mot de passe sans envoyer d'e-mail. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const { user_id, mot_de_passe } = (await request.json()) as {
    user_id: string
    mot_de_passe: string
  }

  if (!user_id || !mot_de_passe) {
    return NextResponse.json(
      { succes: false, erreur: 'user_id et mot_de_passe requis' },
      { status: 400 }
    )
  }
  if (mot_de_passe.length < 6) {
    return NextResponse.json(
      { succes: false, erreur: 'Le mot de passe doit contenir au moins 6 caractères' },
      { status: 400 }
    )
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { error } = await admin.auth.admin.updateUserById(user_id, { password: mot_de_passe })

  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  return NextResponse.json({ succes: true })
}
