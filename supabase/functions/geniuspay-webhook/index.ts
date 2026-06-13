// Edge Function Supabase : webhook de paiement GeniusPay.
// Alternative serverless à app/api/geniuspay-webhook (utiliser l'une OU
// l'autre comme callback_url).
// Déploiement : npx supabase functions deploy geniuspay-webhook --no-verify-jwt
// Secrets requis :
//   npx supabase secrets set GENIUSPAY_API_KEY=... GENIUSPAY_BASE_URL=... GENIUSPAY_WEBHOOK_SECRET=...

import { createClient } from 'jsr:@supabase/supabase-js@2'

const PRIX_PLANS: Record<'pro' | 'reseau', number> = {
  pro: 5000,
  reseau: 12000,
}

const BASE_URL = Deno.env.get('GENIUSPAY_BASE_URL') ?? 'https://api.geniuspay.ci/v1'

async function verifierHmac(corpsBrut: string, signatureRecue: string | null): Promise<boolean> {
  const secret = Deno.env.get('GENIUSPAY_WEBHOOK_SECRET')
  if (!secret || !signatureRecue) return false

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

  const recue = signatureRecue.toLowerCase()
  if (attendu.length !== recue.length) return false
  let diff = 0
  for (let i = 0; i < attendu.length; i++) {
    diff |= attendu.charCodeAt(i) ^ recue.charCodeAt(i)
  }
  return diff === 0
}

async function verifierTransaction(reference: string): Promise<boolean> {
  const apiKey = Deno.env.get('GENIUSPAY_API_KEY')
  if (!apiKey) return false

  const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return false
  const corps = (await res.json()) as { status?: string; data?: { status?: string } }
  const statut = String(corps.status ?? corps.data?.status ?? '').toUpperCase()
  return ['SUCCESS', 'SUCCESSFUL', 'PAID', 'ACCEPTED', 'COMPLETED'].includes(statut)
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ erreur: 'Méthode non autorisée' }, { status: 405 })
  }

  const corpsBrut = await req.text()
  const signature =
    req.headers.get('x-signature') ??
    req.headers.get('x-geniuspay-signature') ??
    req.headers.get('x-token')

  if (!(await verifierHmac(corpsBrut, signature))) {
    return Response.json({ erreur: 'Signature invalide' }, { status: 401 })
  }

  let reference: string | undefined
  try {
    const json = JSON.parse(corpsBrut) as { reference?: string; transaction_id?: string }
    reference = json.reference ?? json.transaction_id
  } catch {
    const params = new URLSearchParams(corpsBrut)
    reference = params.get('reference') ?? params.get('transaction_id') ?? undefined
  }

  const correspondance = reference?.match(/^PRESSCI-([0-9a-f-]{36})-(pro|reseau)-(\d+)$/)
  if (!reference || !correspondance) {
    return Response.json({ erreur: 'Transaction inconnue' }, { status: 400 })
  }
  const ownerId = correspondance[1]
  const plan = correspondance[2] as 'pro' | 'reseau'

  if (!(await verifierTransaction(reference))) {
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
