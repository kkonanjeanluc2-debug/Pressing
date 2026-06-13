import { envoyerSms } from '@/lib/sms'
import { createClient } from '@/lib/supabase/server'
import { messageSmsPret, telephoneInternational } from '@/lib/utils'
import { NextResponse, type NextRequest } from 'next/server'

interface CorpsRequete {
  ticket_id?: string
  client_id?: string
  message?: string
}

/**
 * POST /api/sms
 * - { ticket_id } : envoie le SMS "linge prêt" au client du ticket
 * - { client_id, message } : envoie un message libre (relance créance)
 *
 * La session de l'utilisateur (cookies) est utilisée : RLS garantit
 * qu'il ne peut toucher que les données de son pressing.
 * Réservé aux plans Pro et Réseau.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ succes: false, erreur: 'Non connecté' }, { status: 401 })
  }

  // Vérification du plan : SMS Orange réservés aux plans Pro et Réseau
  const { data: planData } = await supabase.rpc('plan_actuel_utilisateur')
  const plan = (planData as string | null) ?? 'gratuit'
  if (plan === 'gratuit') {
    return NextResponse.json(
      {
        succes: false,
        erreur:
          'Les notifications SMS sont disponibles à partir du plan Pro. Mettez à niveau votre abonnement dans les paramètres.',
      },
      { status: 403 }
    )
  }

  let corps: CorpsRequete
  try {
    corps = (await request.json()) as CorpsRequete
  } catch {
    return NextResponse.json({ succes: false, erreur: 'Requête invalide' }, { status: 400 })
  }

  // ---- Cas 1 : notification "linge prêt" pour un ticket ----
  if (corps.ticket_id) {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('id, numero, pressing_id, client:clients(nom, telephone), pressing:pressings(nom)')
      .eq('id', corps.ticket_id)
      .maybeSingle()

    if (error || !ticket) {
      return NextResponse.json({ succes: false, erreur: 'Ticket introuvable' }, { status: 404 })
    }

    const client = ticket.client as unknown as { nom: string; telephone: string } | null
    const pressing = ticket.pressing as unknown as { nom: string } | null
    if (!client || !pressing) {
      return NextResponse.json({ succes: false, erreur: 'Client introuvable' }, { status: 404 })
    }

    const message = messageSmsPret(client.nom, pressing.nom, ticket.numero as string)
    const resultat = await envoyerSms(telephoneInternational(client.telephone), message)

    if (resultat.succes) {
      await supabase
        .from('tickets')
        .update({ sms_envoye: true, sms_envoye_at: new Date().toISOString() })
        .eq('id', corps.ticket_id)
    }

    return NextResponse.json(resultat, { status: resultat.succes ? 200 : 502 })
  }

  // ---- Cas 2 : message libre vers un client (relance) ----
  if (corps.client_id && corps.message) {
    if (corps.message.length > 320) {
      return NextResponse.json({ succes: false, erreur: 'Message trop long' }, { status: 400 })
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select('telephone')
      .eq('id', corps.client_id)
      .maybeSingle()

    if (error || !client) {
      return NextResponse.json({ succes: false, erreur: 'Client introuvable' }, { status: 404 })
    }

    const resultat = await envoyerSms(
      telephoneInternational(client.telephone as string),
      corps.message
    )
    return NextResponse.json(resultat, { status: resultat.succes ? 200 : 502 })
  }

  return NextResponse.json({ succes: false, erreur: 'Paramètres manquants' }, { status: 400 })
}
