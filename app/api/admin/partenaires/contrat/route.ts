import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** PATCH — sauvegarder le contenu du contrat (avant signature complète) */
export async function PATCH(request: Request): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const { id, contrat_contenu } = (await request.json()) as { id: string; contrat_contenu: string }
  if (!id) return NextResponse.json({ succes: false, erreur: 'id requis' }, { status: 400 })

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { data: p } = await admin
    .from('partenaires')
    .select('signe_admin, signe_partenaire')
    .eq('id', id)
    .single()

  if (p?.signe_admin && p?.signe_partenaire) {
    return NextResponse.json(
      { succes: false, erreur: 'Contrat verrouillé — les deux parties ont signé.' },
      { status: 400 }
    )
  }

  const { error } = await admin.from('partenaires').update({ contrat_contenu }).eq('id', id)
  if (error) return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })

  return NextResponse.json({ succes: true })
}

/** POST — admin signe le contrat */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const { id, nom_admin } = (await request.json()) as { id: string; nom_admin: string }
  if (!id || !nom_admin?.trim()) {
    return NextResponse.json({ succes: false, erreur: 'id et nom_admin requis' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { data: p } = await admin
    .from('partenaires')
    .select('contrat_contenu, signe_admin')
    .eq('id', id)
    .single()

  if (!p?.contrat_contenu?.trim()) {
    return NextResponse.json(
      { succes: false, erreur: "Rédigez d'abord le contrat avant de le signer." },
      { status: 400 }
    )
  }
  if (p?.signe_admin) {
    return NextResponse.json({ succes: false, erreur: 'Vous avez déjà signé ce contrat.' }, { status: 400 })
  }

  const { error } = await admin.from('partenaires').update({
    signe_admin: true,
    signe_admin_at: new Date().toISOString(),
    signe_admin_nom: nom_admin.trim(),
  }).eq('id', id)

  if (error) return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })

  return NextResponse.json({ succes: true })
}
