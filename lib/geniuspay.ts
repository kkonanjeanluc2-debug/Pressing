import { telephoneInternational } from '@/lib/utils'
import { REMISES_DUREE, type Plan } from '@/types'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Intégration GeniusPay (https://geniuspay.ci/docs/api).
 *
 * - Authentification : headers X-API-Key (pk_...) + X-API-Secret (sk_...)
 * - Création de paiement : POST /payments — sans payment_method,
 *   GeniusPay retourne une page de checkout (Wave, Orange, MTN, Moov, carte)
 * - La référence (MTX-...) est générée par GeniusPay : le compte et le
 *   plan voyagent dans metadata et reviennent dans le webhook
 * - Webhook : X-Webhook-Signature = HMAC-SHA256(timestamp + "." + payload)
 *   avec le secret whsec_..., événement payment.success
 */

const BASE_URL = process.env.GENIUSPAY_BASE_URL ?? 'https://geniuspay.ci/api/v1/merchant'

export const PRIX_PLANS: Record<Exclude<Plan, 'gratuit'>, number> = {
  pro: 5000,
  business: 8000,
  reseau: 12000,
}

function entetes(): Record<string, string> | null {
  const cle = process.env.GENIUSPAY_API_KEY
  const secret = process.env.GENIUSPAY_API_SECRET
  if (!cle || !secret) return null
  return {
    'X-API-Key': cle,
    'X-API-Secret': secret,
    'Content-Type': 'application/json',
  }
}

export interface InitPaiementResult {
  succes: boolean
  url?: string
  reference?: string
  erreur?: string
}

interface ReponseCreation {
  success?: boolean
  data?: {
    reference?: string
    checkout_url?: string
    payment_url?: string
  }
  error?: { message?: string }
  message?: string
}

/**
 * Initialise un paiement d'abonnement et retourne l'URL de checkout GeniusPay.
 * Le propriétaire et le plan sont transmis en metadata (retournés au webhook).
 */
export async function initierPaiement(
  ownerId: string,
  plan: Exclude<Plan, 'gratuit'>,
  clientNom: string,
  clientTelephone: string,
  duree: number = 1,
  reductionPromo: number = 0
): Promise<InitPaiementResult> {
  const headers = entetes()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!headers) {
    return { succes: false, erreur: 'Configuration GeniusPay manquante' }
  }

  const remiseDuree = REMISES_DUREE[duree as keyof typeof REMISES_DUREE] ?? 0
  // La remise promo s'additionne à la remise durée, plafonnée à 50 %
  const remiseTotale = Math.min(remiseDuree + reductionPromo, 50)
  const montantTotal = Math.round(PRIX_PLANS[plan] * duree * (1 - remiseTotale / 100))
  const nomPlan = plan === 'pro' ? 'Pro' : plan === 'business' ? 'Business' : 'Réseau'
  const descDuree = duree === 1 ? '1 mois' : `${duree} mois`

  const res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount: montantTotal,
      currency: 'XOF',
      description: `Abonnement PressCI ${nomPlan} — ${descDuree}`,
      customer: {
        name: clientNom,
        phone: telephoneInternational(clientTelephone),
        country: 'CI',
      },
      success_url: `${appUrl}/?paiement=succes`,
      error_url: `${appUrl}/parametres?paiement=echec`,
      metadata: {
        owner_id: ownerId,
        plan,
        duree,
        reduction_promo: reductionPromo,
        produit: 'abonnement_pressci',
      },
    }),
  })

  let corps: ReponseCreation = {}
  try {
    corps = (await res.json()) as ReponseCreation
  } catch {
    // réponse non JSON
  }

  const url = corps.data?.checkout_url ?? corps.data?.payment_url
  if (!res.ok || corps.success !== true || !url) {
    return {
      succes: false,
      erreur:
        corps.error?.message ?? corps.message ?? `Échec initialisation paiement (${res.status})`,
    }
  }

  return { succes: true, url, reference: corps.data?.reference }
}

/**
 * Vérifie la signature d'un webhook GeniusPay :
 * HMAC-SHA256(timestamp + "." + corps brut, secret whsec_...).
 */
export function verifierSignatureWebhook(
  corpsBrut: string,
  signatureRecue: string | null,
  timestamp: string | null
): boolean {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET
  if (!secret || !signatureRecue || !timestamp) return false

  const attendu = createHmac('sha256', secret)
    .update(`${timestamp}.${corpsBrut}`)
    .digest('hex')

  const a = Buffer.from(attendu)
  const b = Buffer.from(signatureRecue.toLowerCase())
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Protection contre le rejeu : timestamp à moins de 5 minutes. */
export function timestampValide(timestamp: string | null): boolean {
  if (!timestamp) return false
  const ts = parseInt(timestamp, 10)
  if (Number.isNaN(ts)) return false
  return Math.abs(Date.now() / 1000 - ts) <= 300
}

export interface TransactionVerifiee {
  confirme: boolean
  metadata: Record<string, unknown>
}

/**
 * Re-vérifie une transaction auprès de GeniusPay :
 * GET /payments/{reference} → status "completed" + metadata.
 */
export async function verifierTransaction(reference: string): Promise<TransactionVerifiee> {
  const headers = entetes()
  if (!headers) return { confirme: false, metadata: {} }

  const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(reference)}`, { headers })
  if (!res.ok) return { confirme: false, metadata: {} }

  let corps: {
    success?: boolean
    data?: { status?: string; metadata?: Record<string, unknown> }
  } = {}
  try {
    corps = (await res.json()) as typeof corps
  } catch {
    return { confirme: false, metadata: {} }
  }

  // GeniusPay peut retourner status "completed", "success" ou "paid"
  const statut = (corps.data?.status ?? '').toLowerCase()
  const estConfirme = corps.success === true && (
    statut === 'completed' || statut === 'success' || statut === 'paid'
  )
  return {
    confirme: estConfirme,
    metadata: corps.data?.metadata ?? {},
  }
}
