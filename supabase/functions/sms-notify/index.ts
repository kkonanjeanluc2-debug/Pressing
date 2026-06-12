// Edge Function Supabase : envoi de SMS "linge prêt" via Orange SMS API (CI).
// Déploiement : npx supabase functions deploy sms-notify
// Secrets requis :
//   npx supabase secrets set ORANGE_SMS_API_KEY=... ORANGE_SMS_SENDER=PressCI

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface CorpsRequete {
  ticket_id?: string
}

interface OrangeTokenResponse {
  access_token: string
  expires_in: number
}

async function obtenirTokenOrange(): Promise<string> {
  const apiKey = Deno.env.get('ORANGE_SMS_API_KEY')
  if (!apiKey) throw new Error('ORANGE_SMS_API_KEY manquante')

  const res = await fetch('https://api.orange.com/oauth/v3/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Auth Orange échouée (${res.status})`)
  const data = (await res.json()) as OrangeTokenResponse
  return data.access_token
}

async function envoyerSmsOrange(destinataire: string, message: string): Promise<boolean> {
  const token = await obtenirTokenOrange()
  const sender = Deno.env.get('ORANGE_SMS_SENDER') ?? 'PressCI'

  const res = await fetch(
    `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent('tel:+2250000')}/requests`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: `tel:${destinataire}`,
          senderAddress: 'tel:+2250000',
          senderName: sender,
          outboundSMSTextMessage: { message },
        },
      }),
    }
  )
  return res.ok
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ erreur: 'Méthode non autorisée' }, { status: 405 })
  }

  // Client lié à la session de l'utilisateur appelant : RLS appliqué.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ succes: false, erreur: 'Non connecté' }, { status: 401 })
  }

  let corps: CorpsRequete
  try {
    corps = (await req.json()) as CorpsRequete
  } catch {
    return Response.json({ succes: false, erreur: 'Requête invalide' }, { status: 400 })
  }
  if (!corps.ticket_id) {
    return Response.json({ succes: false, erreur: 'ticket_id manquant' }, { status: 400 })
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('id, numero, client:clients(nom, telephone), pressing:pressings(nom)')
    .eq('id', corps.ticket_id)
    .maybeSingle()

  if (error || !ticket) {
    return Response.json({ succes: false, erreur: 'Ticket introuvable' }, { status: 404 })
  }

  const client = ticket.client as { nom: string; telephone: string } | null
  const pressing = ticket.pressing as { nom: string } | null
  if (!client || !pressing) {
    return Response.json({ succes: false, erreur: 'Client introuvable' }, { status: 404 })
  }

  const message = `Bonjour ${client.nom}, votre linge est prêt au ${pressing.nom}. Ticket ${ticket.numero}. À bientôt !`
  const telephone = `+225${client.telephone.replace(/\D/g, '').replace(/^225/, '')}`

  try {
    const envoye = await envoyerSmsOrange(telephone, message)
    if (envoye) {
      await supabase
        .from('tickets')
        .update({ sms_envoye: true, sms_envoye_at: new Date().toISOString() })
        .eq('id', corps.ticket_id)
      return Response.json({ succes: true })
    }
    return Response.json({ succes: false, erreur: 'Envoi refusé par Orange', message }, { status: 502 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return Response.json({ succes: false, erreur: msg, message }, { status: 502 })
  }
})
