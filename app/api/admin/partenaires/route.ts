import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface PartenaireLigne {
  id: string
  user_id: string | null
  nom: string
  type_compte: string
  email: string
  telephone: string | null
  rccm: string | null
  taux_commission: number
  code_parrainage: string
  statut: string
  notes: string | null
  created_at: string
}

/** GET /api/admin/partenaires */
export async function GET(): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { data, error } = await admin
    .from('partenaires')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  return NextResponse.json({ succes: true, partenaires: data as PartenaireLigne[] })
}

/** POST /api/admin/partenaires — crée un partenaire + son compte utilisateur */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const body = (await request.json()) as {
    nom: string
    type_compte: string
    email: string
    telephone?: string
    rccm?: string
    taux_commission: number
    notes?: string
  }

  if (!body.nom || !body.email || body.taux_commission == null) {
    return NextResponse.json({ succes: false, erreur: 'Champs obligatoires manquants' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  // Code parrainage unique basé sur le nom (slug + 4 chiffres aléatoires)
  const slug = body.nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8)
  const code_parrainage = `${slug}${Math.floor(1000 + Math.random() * 9000)}`

  // 1. Créer le compte auth
  const mdpTemp = `PI-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: body.email,
    password: mdpTemp,
    email_confirm: true,
    user_metadata: {
      nom: body.nom,
      type_compte: body.type_compte,
      role: 'partenaire',
    },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { succes: false, erreur: authError?.message ?? 'Création du compte échouée' },
      { status: 500 }
    )
  }

  // 2. Insérer dans la table partenaires
  const { error: insertError } = await admin.from('partenaires').insert({
    user_id: authData.user.id,
    nom: body.nom,
    type_compte: body.type_compte,
    email: body.email,
    telephone: body.telephone ?? null,
    rccm: body.rccm ?? null,
    taux_commission: body.taux_commission,
    code_parrainage,
    statut: 'actif',
    notes: body.notes ?? null,
  })

  if (insertError) {
    // Rollback : supprimer l'utilisateur créé
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ succes: false, erreur: insertError.message }, { status: 500 })
  }

  // 3. Générer un lien de connexion
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pressing-delta.vercel.app'
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: body.email,
    options: { redirectTo: `${appUrl}/login` },
  })
  const lienConnexion =
    (linkData as { properties?: { action_link?: string } })?.properties?.action_link ?? null

  return NextResponse.json({
    succes: true,
    code_parrainage,
    mdp_temporaire: mdpTemp,
    lien_connexion: lienConnexion,
  })
}

/** PATCH /api/admin/partenaires — met à jour statut ou taux */
export async function PATCH(request: Request): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const { id, ...champs } = (await request.json()) as {
    id: string
    statut?: string
    taux_commission?: number
    notes?: string
  }

  if (!id) {
    return NextResponse.json({ succes: false, erreur: 'id requis' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { error } = await admin.from('partenaires').update(champs).eq('id', id)
  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  return NextResponse.json({ succes: true })
}
