import { initierPaiement } from '@/lib/geniuspay'
import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/types'
import { NextResponse, type NextRequest } from 'next/server'

interface CorpsRequete {
  plan?: string
}

/**
 * POST /api/abonnement { plan: "pro" | "reseau" }
 * L'abonnement est pris par le PROPRIÉTAIRE (compte/entreprise) :
 * il couvre l'ensemble de ses pressings selon les limites du forfait.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ succes: false, erreur: 'Non connecté' }, { status: 401 })
  }

  // Bloquer les agents (role stocké dans user_metadata à la création du compte)
  // et les partenaires (ils ne peuvent pas souscrire à un plan pressing)
  const roleUtilisateur = (user.user_metadata?.role as string | undefined) ?? 'proprietaire'
  if (roleUtilisateur === 'agent' || roleUtilisateur === 'partenaire') {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé au propriétaire du compte' }, { status: 403 })
  }

  let corps: CorpsRequete
  try {
    corps = (await request.json()) as CorpsRequete
  } catch {
    return NextResponse.json({ succes: false, erreur: 'Requête invalide' }, { status: 400 })
  }

  if (corps.plan !== 'pro' && corps.plan !== 'reseau') {
    return NextResponse.json({ succes: false, erreur: 'Plan inconnu' }, { status: 400 })
  }
  const plan = corps.plan as Exclude<Plan, 'gratuit'>

  // Identité de facturation : profil du titulaire, sinon premier pressing
  const [{ data: profil }, { data: pressing }] = await Promise.all([
    supabase.from('profils').select('nom, telephone').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('pressings')
      .select('nom, telephone')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const nomClient =
    (profil?.nom as string | undefined) ?? (pressing?.nom as string | undefined) ?? 'Client PressCI'
  const telClient =
    (profil?.telephone as string | null | undefined) ??
    (pressing?.telephone as string | null | undefined) ??
    '0000000000'

  const resultat = await initierPaiement(user.id, plan, nomClient, telClient)

  return NextResponse.json(resultat, { status: resultat.succes ? 200 : 502 })
}
