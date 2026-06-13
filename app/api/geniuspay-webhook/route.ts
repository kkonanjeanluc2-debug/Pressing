import { PRIX_PLANS, verifierSignatureWebhook, verifierTransaction } from '@/lib/geniuspay'
import { createAdminClient } from '@/lib/supabase/server'
import type { Plan } from '@/types'
import { NextResponse, type NextRequest } from 'next/server'

interface NotificationGeniusPay {
  reference?: string
  transaction_id?: string
  status?: string
}

/**
 * POST /api/geniuspay-webhook
 * Notification de paiement GeniusPay (callback_url).
 *
 * Sécurité :
 * 1. Vérification HMAC de la signature (header x-signature ou x-token)
 * 2. Re-vérification du statut de la transaction via l'API GeniusPay
 * 3. Idempotence : une transaction n'active jamais deux abonnements
 *
 * reference attendue : "PRESSCI-{ownerId}-{plan}-{timestamp}"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const corpsBrut = await request.text()
  const signature =
    request.headers.get('x-signature') ??
    request.headers.get('x-geniuspay-signature') ??
    request.headers.get('x-token')

  // 1. Signature HMAC
  if (!verifierSignatureWebhook(corpsBrut, signature)) {
    return NextResponse.json({ erreur: 'Signature invalide' }, { status: 401 })
  }

  // JSON ou x-www-form-urlencoded selon la configuration du compte
  let notification: NotificationGeniusPay
  try {
    notification = JSON.parse(corpsBrut) as NotificationGeniusPay
  } catch {
    notification = Object.fromEntries(
      new URLSearchParams(corpsBrut).entries()
    ) as NotificationGeniusPay
  }

  const reference = notification.reference ?? notification.transaction_id
  if (!reference || !reference.startsWith('PRESSCI-')) {
    return NextResponse.json({ erreur: 'Transaction inconnue' }, { status: 400 })
  }

  // Décodage : PRESSCI-{ownerId}-{plan}-{timestamp}
  const correspondance = reference.match(/^PRESSCI-([0-9a-f-]{36})-(pro|reseau)-(\d+)$/)
  if (!correspondance) {
    return NextResponse.json({ erreur: 'Format de transaction invalide' }, { status: 400 })
  }
  const ownerId = correspondance[1] as string
  const plan = correspondance[2] as Exclude<Plan, 'gratuit'>

  // 2. Re-vérification auprès de GeniusPay
  const paiementConfirme = await verifierTransaction(reference)
  if (!paiementConfirme) {
    return NextResponse.json({ statut: 'paiement non confirmé' }, { status: 200 })
  }

  const supabase = createAdminClient()

  // 3. Idempotence
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

  // Activer le nouvel abonnement (30 jours)
  const dateFin = new Date()
  dateFin.setDate(dateFin.getDate() + 30)

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
