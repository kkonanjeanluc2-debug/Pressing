import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password, typeCompte, nomTitulaire, rccm, ncc, codeParrainage } =
    await request.json()

  if (!email || !password || !nomTitulaire) {
    return NextResponse.json({ erreur: 'Données incomplètes.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Création avec email déjà confirmé → pas besoin de validation par mail
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      type_compte: typeCompte,
      nom: nomTitulaire,
      rccm: rccm || null,
      ncc: ncc || null,
    },
  })

  if (authError || !authData.user) {
    const msg = authError?.message ?? ''
    if (msg.includes('already been registered') || msg.includes('already registered')) {
      return NextResponse.json(
        { erreur: 'Un compte existe déjà avec cet email. Connectez-vous plutôt.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { erreur: 'Création du compte impossible. Vérifiez votre réseau et réessayez.' },
      { status: 400 }
    )
  }

  const userId = authData.user.id

  await Promise.all([
    admin.from('profils').upsert({
      user_id: userId,
      type_compte: typeCompte,
      nom: nomTitulaire,
      rccm: rccm || null,
      ncc: ncc || null,
    }),
    admin.from('abonnements').insert({
      owner_id: userId,
      plan: 'gratuit',
      statut: 'actif',
    }),
  ])

  const codeNormalise = (codeParrainage ?? '').trim().toLowerCase()
  if (codeNormalise) {
    await admin
      .from('profils')
      .update({ parraine_par: codeNormalise })
      .eq('user_id', userId)
  }

  return NextResponse.json({ ok: true })
}
