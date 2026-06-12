// Edge Function Supabase : webhook de paiement CinetPay.
// Alternative serverless à app/api/cinetpay-webhook (utiliser l'une OU l'autre
// comme notify_url).
// Déploiement : npx supabase functions deploy cinetpay-webhook --no-verify-jwt
// Secrets requis :
//   npx supabase secrets set CINETPAY_API_KEY=... CINETPAY_SITE_ID=... CINETPAY_WEBHOOK_SECRET=...

import { createClient } from 'jsr:@supabase/supabase-js@2'

const PRIX_PLANS: Record<'pro' | 'reseau', number> = {
  pro: 5000,
  reseau: 12000,
}

async function verifierHmac(corpsBrut: string, tokenRecu: string | null): Promise<boolean> {
  const secret = Deno.env.get('CINETPAY_WEBHOOK_SECRET')
  if (!secret || !tokenRecu) return false

  const cle = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(corpsBrut))
  const attendu = Array.from(new Uint8Array(signature))
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')

  if (attendu.length !== tokenRecu.length) return false
  // Comparaison à temps constant
  let diff = 0
  for (let i = 0; i < attendu.length; i++) {
    diff |= attendu.charCodeAt(i) ^ tokenRecu.charCodeAt(i)
  }
  return diff === 0
}

async function verifierTransaction(transactionId: string): Promise<boolean> {
  const apiKey = Deno.env.get('CINETPAY_API_KEY')
  const siteId = Deno.env.get('CINETPAY_SITE_ID')
  if (!apiKey || !siteId) return false

  const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { code: string; data?: { status: string } }
  return data.code === '00' && data.data?.status === 'ACCEPTED'
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ erreur: 'Méthode non autorisée' }, { status: 405 })
  }

  const corpsBrut = await req.text()
  const token = req.headers.get('x-token')

  if (!(await verifierHmac(corpsBrut, token))) {
    return Response.json({ erreur: 'Signature invalide' }, { status: 401 })
  }

  let transactionId: string | undefined
  try {
    const json = JSON.parse(corpsBrut) as { cpm_trans_id?: string }
    transactionId = json.cpm_trans_id
  } catch {
    transactionId = new URLSearchParams(corpsBrut).get('cpm_trans_id') ?? undefined
  }

  const correspondance = transactionId?.match(/^PRESSCI-([0-9a-f-]{36})-(pro|reseau)-(\d+)$/)
  if (!transactionId || !correspondance) {
    return Response.json({ erreur: 'Transaction inconnue' }, { status: 400 })
  }
  const ownerId = correspondance[1]
  const plan = correspondance[2] as 'pro' | 'reseau'

  if (!(await verifierTransaction(transactionId))) {
    return Response.json({ statut: 'paiement non confirmé' }, { status: 200 })
  }

  // Service role : bypass RLS pour activer l'abonnement
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: existant } = await supabase
    .from('abonnements')
    .select('id')
    .eq('cinetpay_transaction_id', transactionId)
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
    cinetpay_transaction_id: transactionId,
    montant: PRIX_PLANS[plan],
  })

  if (error) {
    return Response.json({ erreur: 'Échec activation' }, { status: 500 })
  }
  return Response.json({ statut: 'abonnement activé' })
})
