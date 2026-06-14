import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { InscritPartenaire } from '@/app/api/partenaire/inscrits/route'

export interface VersementLigne {
  id: string
  montant: number
  commentaire: string | null
  verse_par: string
  created_at: string
}

export interface DetailPartenaire {
  partenaire: {
    id: string
    nom: string
    type_compte: string
    email: string
    telephone: string | null
    taux_commission: number
    code_parrainage: string
    statut: string
  }
  inscrits: InscritPartenaire[]
  commissions: {
    ca_total: number
    commission_estimee: number
    deja_verse: number
    a_verser: number
  }
  versements: VersementLigne[]
}

/** GET /api/admin/partenaires/[id] — détail d'un partenaire avec inscrits + commissions */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { data: partenaire } = await admin
    .from('partenaires')
    .select('id, nom, type_compte, email, telephone, taux_commission, code_parrainage, statut')
    .eq('id', params.id)
    .maybeSingle()

  if (!partenaire) {
    return NextResponse.json({ succes: false, erreur: 'Partenaire introuvable' }, { status: 404 })
  }

  const { data: profils } = await admin
    .from('profils')
    .select('user_id, nom, type_compte, created_at')
    .eq('parraine_par', (partenaire.code_parrainage as string).toLowerCase())

  const profils_ = profils ?? []
  const userIds = profils_.map((p) => p.user_id as string)

  const [{ data: abosActifs }, { data: paiements }, { data: versements }] = await Promise.all([
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
    admin
      .from('versements_partenaires')
      .select('id, montant, commentaire, verse_par, created_at')
      .eq('partenaire_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  const emailParUserId: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of users?.users ?? []) {
      if (userIds.includes(u.id)) emailParUserId[u.id] = u.email ?? ''
    }
  }

  const montantParUser: Record<string, number> = {}
  for (const p of paiements ?? []) {
    const uid = p.owner_id as string
    montantParUser[uid] = (montantParUser[uid] ?? 0) + (p.montant as number)
  }

  const planParUser: Record<string, string> = {}
  const expireParUser: Record<string, string | null> = {}
  for (const a of abosActifs ?? []) {
    planParUser[a.owner_id as string] = a.plan as string
    expireParUser[a.owner_id as string] = (a as Record<string, unknown>).expire_le as string | null
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
  const commission_estimee = Math.round(ca_total * ((partenaire.taux_commission as number) / 100))
  const deja_verse = (versements ?? []).reduce((s, v) => s + (v.montant as number), 0)
  const a_verser = Math.max(0, commission_estimee - deja_verse)

  const detail: DetailPartenaire = {
    partenaire: partenaire as DetailPartenaire['partenaire'],
    inscrits,
    commissions: { ca_total, commission_estimee, deja_verse, a_verser },
    versements: (versements ?? []) as VersementLigne[],
  }

  return NextResponse.json({ succes: true, detail })
}

/** POST /api/admin/partenaires/[id] — enregistrer un versement de commission */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const body = (await request.json()) as {
    montant: number
    commentaire?: string
    verse_par: string
  }

  if (!body.montant || Number(body.montant) <= 0) {
    return NextResponse.json({ succes: false, erreur: 'Montant invalide' }, { status: 400 })
  }
  if (!body.verse_par?.trim()) {
    return NextResponse.json({ succes: false, erreur: 'Nom du verseur requis' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { data: partenaire } = await admin
    .from('partenaires')
    .select('id')
    .eq('id', params.id)
    .maybeSingle()

  if (!partenaire) {
    return NextResponse.json({ succes: false, erreur: 'Partenaire introuvable' }, { status: 404 })
  }

  const { error } = await admin.from('versements_partenaires').insert({
    partenaire_id: params.id,
    montant: Math.round(Number(body.montant)),
    commentaire: body.commentaire?.trim() || null,
    verse_par: body.verse_par.trim(),
  })

  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  return NextResponse.json({ succes: true })
}
