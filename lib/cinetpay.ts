import { createHmac, timingSafeEqual } from 'crypto'
import type { Plan } from '@/types'

/**
 * Intégration CinetPay : initialisation de paiement (Wave & Orange Money)
 * et vérification HMAC des webhooks.
 * Docs : https://docs.cinetpay.com
 */

const CINETPAY_BASE_URL = 'https://api-checkout.cinetpay.com/v2'

export const PRIX_PLANS: Record<Exclude<Plan, 'gratuit'>, number> = {
  pro: 5000,
  reseau: 12000,
}

interface CinetPayInitResponse {
  code: string
  message: string
  data?: {
    payment_url: string
    payment_token: string
  }
}

export interface InitPaiementResult {
  succes: boolean
  url?: string
  erreur?: string
}

/**
 * Initialise un paiement d'abonnement et retourne l'URL de paiement CinetPay.
 * transaction_id encode le pressing et le plan : "PRESSCI-{pressingId}-{plan}-{timestamp}"
 */
export async function initierPaiement(
  pressingId: string,
  plan: Exclude<Plan, 'gratuit'>,
  clientNom: string,
  clientTelephone: string
): Promise<InitPaiementResult> {
  const apiKey = process.env.CINETPAY_API_KEY
  const siteId = process.env.CINETPAY_SITE_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!apiKey || !siteId) {
    return { succes: false, erreur: 'Configuration CinetPay manquante' }
  }

  const transactionId = `PRESSCI-${pressingId}-${plan}-${Date.now()}`

  const res = await fetch(`${CINETPAY_BASE_URL}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
      amount: PRIX_PLANS[plan],
      currency: 'XOF',
      description: `Abonnement PressCI ${plan}`,
      customer_name: clientNom,
      customer_phone_number: clientTelephone,
      notify_url: `${appUrl}/api/cinetpay-webhook`,
      return_url: `${appUrl}/parametres?paiement=retour`,
      channels: 'MOBILE_MONEY',
      metadata: JSON.stringify({ pressing_id: pressingId, plan }),
    }),
  })

  const data = (await res.json()) as CinetPayInitResponse

  if (data.code !== '201' || !data.data) {
    return { succes: false, erreur: data.message || 'Échec initialisation paiement' }
  }

  return { succes: true, url: data.data.payment_url }
}

/**
 * Vérifie la signature HMAC d'un webhook CinetPay (header x-token).
 * Le token = HMAC-SHA256 de la concaténation des champs du POST,
 * signée avec la clé secrète du compte.
 */
export function verifierSignatureWebhook(corpsBrut: string, tokenRecu: string | null): boolean {
  const secret = process.env.CINETPAY_WEBHOOK_SECRET
  if (!secret || !tokenRecu) return false

  const attendu = createHmac('sha256', secret).update(corpsBrut).digest('hex')

  const a = Buffer.from(attendu)
  const b = Buffer.from(tokenRecu)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Re-vérifie le statut d'une transaction auprès de CinetPay
 * (recommandé : ne jamais se fier au seul webhook).
 */
export async function verifierTransaction(transactionId: string): Promise<boolean> {
  const apiKey = process.env.CINETPAY_API_KEY
  const siteId = process.env.CINETPAY_SITE_ID
  if (!apiKey || !siteId) return false

  const res = await fetch(`${CINETPAY_BASE_URL}/payment/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
    }),
  })

  if (!res.ok) return false
  const data = (await res.json()) as { code: string; data?: { status: string } }
  return data.code === '00' && data.data?.status === 'ACCEPTED'
}
