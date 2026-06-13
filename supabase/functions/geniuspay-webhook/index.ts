// Edge Function Supabase : webhook GeniusPay (https://geniuspay.ci/docs/api).
// Alternative serverless à app/api/geniuspay-webhook.
// Déploiement : npx supabase functions deploy geniuspay-webhook --no-verify-jwt
// Secrets requis :
//   npx supabase secrets set GENIUSPAY_API_KEY=pk_... GENIUSPAY_API_SECRET=sk_... GENIUSPAY_WEBHOOK_SECRET=whsec_...

import { createClient } from 'jsr:@supabase/supabase-js@2'

const PRIX_PLANS: Record<'pro' | 'reseau', number> = {
  pro: 5000,
  reseau: 12000,
}

const BASE_URL = Deno.env.get('GENIUSPAY_BASE_URL') ?? 'https://geniuspay.ci/api/v1/merchant'

/** Signature GeniusPay : HMAC-SHA256(timestamp + "." + payload, whsec_...) */
async function verifierSignature(
  corpsBrut: string,
  signatureRecue: string | null,
  timestamp: string | null
): Promise<boolean> {
  const secret = Deno.env.get('GENIUSPAY_WEBHOOK_SECRET')
  if (!secret || !signatureRecue || !timestamp) return false

  const cle = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cle,
    new TextEncoder().encode(`${timestamp}.${corpsBrut}`)
  )
  const attendu = Array.from(new Uint8Array(signature))
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')

  const recue = signatureRecue.toLowerCase()
  if (attendu.length !== recue.length) return false
  let diff = 0
  for (let i = 0; i < attendu.length; i++) {
    diff |= attendu.charCodeAt(i) ^ recue.charCodeAt(i)
  }
  return diff === 0
}

async function verifierTransaction(
  reference: string
): Promise<{ confirme: boolean; metadata: Record<string, unknown> }> {
  const cle = Deno.env.get('GENIUSPAY_API_KEY')
  const secret = Deno.env.get('GENIUSPAY_API_SECRET')
  if (!cle || !secret) return { confirme: false, metadata: {} }

  const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(reference)}`, {
    headers: { 'X-API-Key': cle, 'X-API-Secret': secret },
  })
  if (!res.ok) return { confirme: false, metadata: {} }
  const corps = (await res.json()) as {
    success?: boolean
    data?: { status?: string; metadata?: Record<string, unknown> }
  }
  return {
    confirme: corps.success === true && corps.data?.status === 'completed',
    metadata: corps.data?.metadata ?? {},
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ erreur: 'Méthode non autorisée' }, { status: 405 })
  }

  const corpsBrut = await req.text()
  const signature = req.headers.get('x-webhook-signature')
  const timestamp = req.headers.get('x-webhook-timestamp')

  if (!(await verifierSignature(corpsBrut, signature, timestamp))) {
    return Response.json({ erreur: 'Signature invalide' }, { status: 401 })
  }
  // Anti-rejeu : 5 minutes
  const ts = parseInt(timestamp ?? '', 10)
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return Response.json({ erreur: 'Timestamp expiré' }, { status: 400 })
  }

  let payload: {
    event?: string
    data?: { reference?: string; metadata?: Record<string, unknown> }
  }
  try {
    payload = JSON.parse(corpsBrut) as typeof payload
  } catch {
    return Response.json({ erreur: 'Payload invalide' }, { status: 400 })
  }

  const evenement = payload.event ?? req.headers.get('x-webhook-event')
  if (evenement !== 'payment.success') {
    return Response.json({ statut: `événement ${evenement ?? 'inconnu'} ignoré` })
  }

  const reference = payload.data?.reference
  if (!reference) {
    return Response.json({ erreur: 'Référence manquante' }, { status: 400 })
  }

  const transaction = await verifierTransaction(reference)
  if (!transaction.confirme) {
    return Response.json({ statut: 'paiement non confirmé' }, { status: 200 })
  }

  const metadata =
    Object.keys(transaction.metadata).length > 0
      ? transaction.metadata
      : payload.data?.metadata ?? {}
  const ownerId = typeof metadata.owner_id === 'string' ? metadata.owner_id : null
  const plan =
    metadata.plan === 'pro' || metadata.plan === 'reseau'
      ? (metadata.plan as 'pro' | 'reseau')
      : null

  if (!ownerId || !/^[0-9a-f-]{36}$/.test(ownerId) || !plan) {
    return Response.json({ erreur: 'Metadata invalides' }, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: existant } = await supabase
    .from('abonnements')
    .select('id')
    .eq('transaction_id', reference)
    .maybeSingle()
  if (existant) {
    return Response.json({ statut: 'déjà traité' })
  }

  await supabase
    .from('abonnements')
    .update({ statut: 'expire' })
    .eq('owner_id', ownerId)
    .eq('statut', 'actif')

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
    return Response.json({ erreur: 'Échec activation' }, { status: 500 })
  }
  return Response.json({ statut: 'abonnement activé' })
})
