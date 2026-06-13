import { createHmac, timingSafeEqual } from 'crypto'
import type { Plan } from '@/types'

/**
 * Intégration GeniusPay : paiement des abonnements (mobile money)
 * et vérification HMAC des webhooks.
 *
 * L'URL de base et les chemins sont configurables : ajustez
 * GENIUSPAY_BASE_URL selon la documentation de votre compte marchand.
 */

const BASE_URL = process.env.GENIUSPAY_BASE_URL ?? 'https://api.geniuspay.ci/v1'

export const PRIX_PLANS: Record<Exclude<Plan, 'gratuit'>, number> = {
  pro: 5000,
  reseau: 12000,
}

export interface InitPaiementResult {
  succes: boolean
  url?: string
  erreur?: string
}

/** Cherche l'URL de paiement dans la réponse, quel que soit son format. */
function extraireUrlPaiement(reponse: unknown): string | null {
  if (typeof reponse !== 'object' || reponse === null) return null
  const r = reponse as Record<string, unknown>
  const candidats = [
    r.payment_url,
    r.checkout_url,
    r.url,
    (r.data as Record<string, unknown> | undefined)?.payment_url,
    (r.data as Record<string, unknown> | undefined)?.checkout_url,
    (r.data as Record<string, unknown> | undefined)?.url,
  ]
  const url = candidats.find((c) => typeof c === 'string' && c.startsWith('http'))
  return (url as string) ?? null
}

/**
 * Initialise un paiement d'abonnement et retourne l'URL de paiement GeniusPay.
 * L'abonnement appartient au propriétaire/entreprise :
 * reference = "PRESSCI-{ownerId}-{plan}-{timestamp}"
 */
export async function initierPaiement(
  ownerId: string,
  plan: Exclude<Plan, 'gratuit'>,
  clientNom: string,
  clientTelephone: string
): Promise<InitPaiementResult> {
  const apiKey = process.env.GENIUSPAY_API_KEY
  const merchantId = process.env.GENIUSPAY_MERCHANT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!apiKey || !merchantId) {
    return { succes: false, erreur: 'Configuration GeniusPay manquante' }
  }

  const reference = `PRESSCI-${ownerId}-${plan}-${Date.now()}`

  const res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      merchant_id: merchantId,
      reference,
      transaction_id: reference,
      amount: PRIX_PLANS[plan],
      currency: 'XOF',
      description: `Abonnement PressCI ${plan}`,
      customer_name: clientNom,
      customer_phone: clientTelephone,
      callback_url: `${appUrl}/api/geniuspay-webhook`,
      notify_url: `${appUrl}/api/geniuspay-webhook`,
      return_url: `${appUrl}/parametres?paiement=retour`,
      metadata: { owner_id: ownerId, plan },
    }),
  })

  let corps: unknown = null
  try {
    corps = await res.json()
  } catch {
    // réponse non JSON
  }

  const url = extraireUrlPaiement(corps)
  if (!res.ok || !url) {
    const message =
      (typeof corps === 'object' && corps !== null && 'message' in corps
        ? String((corps as Record<string, unknown>).message)
        : null) ?? `Échec initialisation paiement (${res.status})`
    return { succes: false, erreur: message }
  }

  return { succes: true, url }
}

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook GeniusPay
 * (corps brut signé avec la clé secrète, signature en hexadécimal).
 */
export function verifierSignatureWebhook(corpsBrut: string, signatureRecue: string | null): boolean {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET
  if (!secret || !signatureRecue) return false

  const attendu = createHmac('sha256', secret).update(corpsBrut).digest('hex')

  const a = Buffer.from(attendu)
  const b = Buffer.from(signatureRecue.toLowerCase())
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Re-vérifie le statut d'une transaction auprès de GeniusPay
 * (recommandé : ne jamais se fier au seul webhook).
 */
export async function verifierTransaction(reference: string): Promise<boolean> {
  const apiKey = process.env.GENIUSPAY_API_KEY
  if (!apiKey) return false

  const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return false

  let corps: unknown = null
  try {
    corps = await res.json()
  } catch {
    return false
  }
  const r = corps as Record<string, unknown>
  const statut = String(
    r.status ?? (r.data as Record<string, unknown> | undefined)?.status ?? ''
  ).toUpperCase()
  return ['SUCCESS', 'SUCCESSFUL', 'PAID', 'ACCEPTED', 'COMPLETED'].includes(statut)
}
