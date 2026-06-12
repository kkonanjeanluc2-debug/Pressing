/**
 * Intégration Orange SMS API (Côte d'Ivoire).
 * Docs : https://developer.orange.com/apis/sms-ci
 *
 * ORANGE_SMS_API_KEY = "Authorization header" Basic (client_id:client_secret en base64)
 * ORANGE_SMS_SENDER  = nom d'expéditeur ou numéro dédié (ex: "PressCI" / "+2250000")
 */

interface OrangeTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface ResultatSms {
  succes: boolean
  erreur?: string
}

let tokenCache: { token: string; expiresAt: number } | null = null

async function obtenirToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token
  }

  const apiKey = process.env.ORANGE_SMS_API_KEY
  if (!apiKey) throw new Error('ORANGE_SMS_API_KEY manquante')

  const res = await fetch('https://api.orange.com/oauth/v3/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`Échec authentification Orange (${res.status})`)
  }

  const data = (await res.json()) as OrangeTokenResponse
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

/**
 * Envoie un SMS via Orange SMS API CI.
 * @param destinataire numéro au format international (+225XXXXXXXXXX)
 * @param message contenu du SMS (160 caractères max recommandé)
 */
export async function envoyerSms(destinataire: string, message: string): Promise<ResultatSms> {
  try {
    const token = await obtenirToken()
    const sender = process.env.ORANGE_SMS_SENDER ?? 'PressCI'
    // L'URL Orange utilise le numéro expéditeur "dev" du pays (CI)
    const senderAddress = encodeURIComponent('tel:+2250000')

    const res = await fetch(
      `https://api.orange.com/smsmessaging/v1/outbound/${senderAddress}/requests`,
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

    if (!res.ok) {
      const corps = await res.text()
      return {
        succes: false,
        erreur: `Orange SMS a refusé l'envoi (${res.status}) : ${corps.slice(0, 200)}`,
      }
    }

    return { succes: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return { succes: false, erreur: msg }
  }
}
