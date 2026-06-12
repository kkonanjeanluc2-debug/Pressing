import { initierPaiement } from '@/lib/cinetpay'
import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/types'
import { NextResponse, type NextRequest } from 'next/server'

interface CorpsRequete {
  plan?: string
  pressing_id?: string
}

/**
 * POST /api/abonnement { plan: "pro" | "reseau", pressing_id? }
 * Initialise un paiement CinetPay et retourne l'URL de la page de paiement.
 * Si pressing_id est omis, le premier pressing du compte est utilisé.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ succes: false, erreur: 'Non connecté' }, { status: 401 })
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

  let requete = supabase
    .from('pressings')
    .select('id, nom, telephone')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
  if (corps.pressing_id) {
    requete = requete.eq('id', corps.pressing_id)
  }
  const { data: pressing, error } = await requete.maybeSingle()

  if (error || !pressing) {
    return NextResponse.json({ succes: false, erreur: 'Pressing introuvable' }, { status: 404 })
  }

  const resultat = await initierPaiement(
    pressing.id as string,
    plan,
    pressing.nom as string,
    (pressing.telephone as string | null) ?? '0000000000'
  )

  return NextResponse.json(resultat, { status: resultat.succes ? 200 : 502 })
}
