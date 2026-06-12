import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

interface CorpsRequete {
  ticket_id?: string
  pdf_base64?: string
}

const TAILLE_MAX_OCTETS = 2 * 1024 * 1024 // 2 Mo

/**
 * POST /api/ticket-pdf { ticket_id, pdf_base64 }
 * Héberge le PDF du ticket sur Supabase Storage (bucket public "tickets")
 * et retourne son URL — utilisée pour l'envoi WhatsApp au client.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ succes: false, erreur: 'Non connecté' }, { status: 401 })
  }

  let corps: CorpsRequete
  try {
    corps = (await request.json()) as CorpsRequete
  } catch {
    return NextResponse.json({ succes: false, erreur: 'Requête invalide' }, { status: 400 })
  }
  if (!corps.ticket_id || !corps.pdf_base64) {
    return NextResponse.json({ succes: false, erreur: 'Champs manquants' }, { status: 400 })
  }

  // L'appelant doit avoir accès au ticket (RLS via sa session)
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, numero')
    .eq('id', corps.ticket_id)
    .maybeSingle()
  if (!ticket) {
    return NextResponse.json({ succes: false, erreur: 'Ticket introuvable' }, { status: 404 })
  }

  let contenu: Buffer
  try {
    contenu = Buffer.from(corps.pdf_base64, 'base64')
  } catch {
    return NextResponse.json({ succes: false, erreur: 'PDF invalide' }, { status: 400 })
  }
  if (contenu.length === 0 || contenu.length > TAILLE_MAX_OCTETS) {
    return NextResponse.json({ succes: false, erreur: 'PDF invalide ou trop lourd' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Bucket public "tickets" créé au premier envoi (ignorer s'il existe déjà)
  await admin.storage.createBucket('tickets', { public: true }).catch(() => undefined)

  const chemin = `ticket-${corps.ticket_id}-${Date.now()}.pdf`
  const { error: erreurUpload } = await admin.storage
    .from('tickets')
    .upload(chemin, contenu, { contentType: 'application/pdf' })

  if (erreurUpload) {
    return NextResponse.json(
      { succes: false, erreur: "L'hébergement du PDF a échoué" },
      { status: 500 }
    )
  }

  const { data } = admin.storage.from('tickets').getPublicUrl(chemin)
  return NextResponse.json({ succes: true, url: data.publicUrl })
}
