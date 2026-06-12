import { verifierSignatureWebhook, verifierTransaction, PRIX_PLANS } from '@/lib/cinetpay'
import { createAdminClient } from '@/lib/supabase/server'
import type { Plan } from '@/types'
import { NextResponse, type NextRequest } from 'next/server'

interface NotificationCinetPay {
  cpm_trans_id?: string
  cpm_site_id?: string
  cpm_amount?: string
  cpm_trans_status?: string
}

/**
 * POST /api/cinetpay-webhook
 * Notification de paiement CinetPay (notify_url).
 *
 * Sécurité :
 * 1. Vérification HMAC du header x-token
 * 2. Re-vérification du statut de la transaction via l'API CinetPay
 *
 * transaction_id attendu : "PRESSCI-{pressingId}-{plan}-{timestamp}"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const corpsBrut = await request.text()
  const token = request.headers.get('x-token')

  // 1. Signature HMAC
  if (!verifierSignatureWebhook(corpsBrut, token)) {
    return NextResponse.json({ erreur: 'Signature invalide' }, { status: 401 })
  }

  // CinetPay envoie du x-www-form-urlencoded ou du JSON selon la config
  let notification: NotificationCinetPay
  try {
    notification = JSON.parse(corpsBrut) as NotificationCinetPay
  } catch {
    notification = Object.fromEntries(
      new URLSearchParams(corpsBrut).entries()
    ) as NotificationCinetPay
  }

  const transactionId = notification.cpm_trans_id
  if (!transactionId || !transactionId.startsWith('PRESSCI-')) {
    return NextResponse.json({ erreur: 'Transaction inconnue' }, { status: 400 })
  }

  // Décodage : PRESSCI-{uuid}-{plan}-{timestamp}
  const correspondance = transactionId.match(
    /^PRESSCI-([0-9a-f-]{36})-(pro|reseau)-(\d+)$/
  )
  if (!correspondance) {
    return NextResponse.json({ erreur: 'Format de transaction invalide' }, { status: 400 })
  }
  const pressingId = correspondance[1] as string
  const plan = correspondance[2] as Exclude<Plan, 'gratuit'>

  // 2. Re-vérification auprès de CinetPay (jamais se fier au seul webhook)
  const paiementConfirme = await verifierTransaction(transactionId)
  if (!paiementConfirme) {
    return NextResponse.json({ statut: 'paiement non confirmé' }, { status: 200 })
  }

  const supabase = createAdminClient()

  // Idempotence : ne pas traiter deux fois la même transaction
  const { data: existant } = await supabase
    .from('abonnements')
    .select('id')
    .eq('cinetpay_transaction_id', transactionId)
    .maybeSingle()
  if (existant) {
    return NextResponse.json({ statut: 'déjà traité' }, { status: 200 })
  }

  // Expirer les anciens abonnements actifs
  await supabase
    .from('abonnements')
    .update({ statut: 'expire' })
    .eq('pressing_id', pressingId)
    .eq('statut', 'actif')

  // Activer le nouvel abonnement (30 jours)
  const dateFin = new Date()
  dateFin.setDate(dateFin.getDate() + 30)

  const { error } = await supabase.from('abonnements').insert({
    pressing_id: pressingId,
    plan,
    statut: 'actif',
    date_fin: dateFin.toISOString(),
    cinetpay_transaction_id: transactionId,
    montant: PRIX_PLANS[plan],
  })

  if (error) {
    return NextResponse.json({ erreur: 'Échec activation abonnement' }, { status: 500 })
  }

  return NextResponse.json({ statut: 'abonnement activé' }, { status: 200 })
}
