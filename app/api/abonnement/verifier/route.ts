import { PRIX_PLANS, verifierTransaction } from '@/lib/geniuspay'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Plan } from '@/types'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/abonnement/verifier { reference: "MTX-..." }
 *
 * Fallback au webhook : vérifie directement la transaction auprès de GeniusPay
 * et active l'abonnement si le paiement est confirmé.
 *
 * Sécurité :
 * - L'utilisateur doit être connecté
 * - Le metadata.owner_id de la transaction doit correspondre à l'utilisateur connecté
 * - Idempotent : ne crée pas de doublon si déjà activé
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ succes: false, erreur: 'Non connecté' }, { status: 401 })
  }

  const body = (await request.json()) as { reference?: string }
  const reference = body.reference?.trim()
  if (!reference) {
    return NextResponse.json({ succes: false, erreur: 'Référence manquante' }, { status: 400 })
  }

  // Vérification auprès de GeniusPay
  const { confirme, metadata } = await verifierTransaction(reference)
  if (!confirme) {
    return NextResponse.json({ succes: false, erreur: 'Paiement non confirmé' }, { status: 402 })
  }

  // Le owner_id dans les metadata doit correspondre à l'utilisateur connecté
  if (metadata.owner_id !== user.id) {
    return NextResponse.json({ succes: false, erreur: 'Non autorisé' }, { status: 403 })
  }

  const plan =
    metadata.plan === 'pro' || metadata.plan === 'reseau'
      ? (metadata.plan as Exclude<Plan, 'gratuit'>)
      : null
  if (!plan) {
    return NextResponse.json({ succes: false, erreur: 'Plan invalide dans les metadata' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Idempotence : si déjà activé pour cette référence, retourner le plan sans recréer
  const { data: existant } = await admin
    .from('abonnements')
    .select('plan')
    .eq('transaction_id', reference)
    .maybeSingle()
  if (existant) {
    return NextResponse.json({ succes: true, plan: existant.plan as Plan })
  }

  // Expirer les anciens abonnements actifs
  await admin
    .from('abonnements')
    .update({ statut: 'expire' })
    .eq('owner_id', user.id)
    .eq('statut', 'actif')

  // Activer le nouvel abonnement (30 jours)
  const dateFin = new Date()
  dateFin.setDate(dateFin.getDate() + 30)

  const { error } = await admin.from('abonnements').insert({
    owner_id: user.id,
    plan,
    statut: 'actif',
    date_fin: dateFin.toISOString(),
    transaction_id: reference,
    montant: PRIX_PLANS[plan],
  })

  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  return NextResponse.json({ succes: true, plan })
}
