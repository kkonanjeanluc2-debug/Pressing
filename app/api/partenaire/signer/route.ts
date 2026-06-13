import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** POST — le partenaire signe son contrat */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ succes: false, erreur: 'Non authentifié' }, { status: 401 })

  const { nom_signature } = (await request.json()) as { nom_signature: string }
  if (!nom_signature?.trim()) {
    return NextResponse.json({ succes: false, erreur: 'Votre nom de signature est requis.' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { data: p } = await admin
    .from('partenaires')
    .select('id, signe_admin, signe_partenaire, contrat_contenu')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!p) return NextResponse.json({ succes: false, erreur: 'Compte partenaire introuvable.' }, { status: 404 })
  if (!p.signe_admin) {
    return NextResponse.json(
      { succes: false, erreur: "L'administrateur doit signer le contrat en premier." },
      { status: 400 }
    )
  }
  if (p.signe_partenaire) {
    return NextResponse.json({ succes: false, erreur: 'Vous avez déjà signé ce contrat.' }, { status: 400 })
  }
  if (!p.contrat_contenu?.trim()) {
    return NextResponse.json({ succes: false, erreur: 'Aucun contrat disponible.' }, { status: 400 })
  }

  const { error } = await admin.from('partenaires').update({
    signe_partenaire: true,
    signe_partenaire_at: new Date().toISOString(),
    signe_partenaire_nom: nom_signature.trim(),
  }).eq('id', p.id)

  if (error) return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })

  return NextResponse.json({ succes: true })
}
