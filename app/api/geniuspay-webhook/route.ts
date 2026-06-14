import {
  PRIX_PLANS,
  timestampValide,
  verifierSignatureWebhook,
  verifierTransaction,
} from '@/lib/geniuspay'
import { createAdminClient } from '@/lib/supabase/server'
import type { Plan } from '@/types'
import { NextResponse, type NextRequest } from 'next/server'

interface PayloadWebhook {
  event?: string
  data?: {
    reference?: string
    status?: string
    metadata?: Record<string, unknown>
  }
}

/**
 * POST /api/geniuspay-webhook
 * Webhook GeniusPay (événement payment.success).
 *
 * Sécurité :
 * 1. Signature : HMAC-SHA256(timestamp + "." + payload, whsec_...)
 *    via les headers X-Webhook-Signature / X-Webhook-Timestamp
 * 2. Anti-rejeu : timestamp à moins de 5 minutes
 * 3. Re-vérification de la transaction via l'API (status completed)
 * 4. Idempotence : une référence n'active jamais deux abonnements
 *
 * Le propriétaire et le plan sont lus dans metadata (owner_id, plan),
 * tels qu'envoyés à la création du paiement.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const corpsBrut = await request.text()
  const signature = request.headers.get('x-webhook-signature')
  const timestamp = request.headers.get('x-webhook-timestamp')
  const evenementHeader = request.headers.get('x-webhook-event')

  // 1. Signature + 2. anti-rejeu
  if (!verifierSignatureWebhook(corpsBrut, signature, timestamp)) {
    return NextResponse.json({ erreur: 'Signature invalide' }, { status: 401 })
  }
  if (!timestampValide(timestamp)) {
    return NextResponse.json({ erreur: 'Timestamp expiré' }, { status: 400 })
  }

  let payload: PayloadWebhook
  try {
    payload = JSON.parse(corpsBrut) as PayloadWebhook
  } catch {
    return NextResponse.json({ erreur: 'Payload invalide' }, { status: 400 })
  }

  // Seul un événement de paiement réussi déclenche une activation
  // GeniusPay peut envoyer "payment.success", "payment_success" ou "PAYMENT_SUCCESS"
  const evenement = (payload.event ?? evenementHeader ?? '').toLowerCase().replace(/[._]/g, '_')
  if (!evenement.includes('payment') || !evenement.includes('success')) {
    return NextResponse.json({ statut: `événement ${evenement || 'inconnu'} ignoré` })
  }

  const reference = payload.data?.reference
  if (!reference) {
    return NextResponse.json({ erreur: 'Référence manquante' }, { status: 400 })
  }

  // 3. Re-vérification auprès de GeniusPay (statut + metadata de confiance)
  const transaction = await verifierTransaction(reference)
  if (!transaction.confirme) {
    return NextResponse.json({ statut: 'paiement non confirmé' }, { status: 200 })
  }

  const metadata =
    Object.keys(transaction.metadata).length > 0
      ? transaction.metadata
      : payload.data?.metadata ?? {}
  const ownerId = typeof metadata.owner_id === 'string' ? metadata.owner_id : null
  const plan =
    metadata.plan === 'pro' || metadata.plan === 'business' || metadata.plan === 'reseau'
      ? (metadata.plan as Exclude<Plan, 'gratuit'>)
      : null
  const duree =
    typeof metadata.duree === 'number' && [1, 3, 6, 12].includes(metadata.duree as number)
      ? (metadata.duree as number)
      : 1

  if (!ownerId || !/^[0-9a-f-]{36}$/.test(ownerId) || !plan) {
    return NextResponse.json({ erreur: 'Metadata invalides' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 4. Idempotence
  const { data: existant } = await supabase
    .from('abonnements')
    .select('id')
    .eq('transaction_id', reference)
    .maybeSingle()
  if (existant) {
    return NextResponse.json({ statut: 'déjà traité' }, { status: 200 })
  }

  // Expirer les anciens abonnements actifs du propriétaire
  await supabase
    .from('abonnements')
    .update({ statut: 'expire' })
    .eq('owner_id', ownerId)
    .eq('statut', 'actif')

  // Activer le nouvel abonnement (duree × 30 jours)
  const dateFin = new Date()
  dateFin.setDate(dateFin.getDate() + duree * 30)

  const { error } = await supabase.from('abonnements').insert({
    owner_id: ownerId,
    plan,
    statut: 'actif',
    date_fin: dateFin.toISOString(),
    transaction_id: reference,
    montant: PRIX_PLANS[plan],
  })

  if (error) {
    return NextResponse.json({ erreur: 'Échec activation abonnement' }, { status: 500 })
  }

  return NextResponse.json({ statut: 'abonnement activé' }, { status: 200 })
}
