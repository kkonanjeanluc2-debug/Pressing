import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface VersementPartenaire {
  id: string
  montant: number
  mode_paiement: string
  commentaire: string | null
  verse_par: string
  created_at: string
}

/** GET /api/partenaire/versements — historique des versements reçus par le partenaire connecté */
export async function GET(): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ succes: false, erreur: 'Non authentifié' }, { status: 401 })

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { data: partenaire } = await admin
    .from('partenaires')
    .select('id, statut')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!partenaire) {
    return NextResponse.json({ succes: false, erreur: 'Compte partenaire introuvable.' }, { status: 404 })
  }
  if ((partenaire.statut as string) !== 'actif') {
    return NextResponse.json({ succes: false, erreur: 'Compte partenaire suspendu.' }, { status: 403 })
  }

  const { data: versements } = await admin
    .from('versements_partenaires')
    .select('id, montant, mode_paiement, commentaire, verse_par, created_at')
    .eq('partenaire_id', partenaire.id)
    .order('created_at', { ascending: false })

  const total_verse = (versements ?? []).reduce((s, v) => s + (v.montant as number), 0)

  return NextResponse.json({
    succes: true,
    versements: (versements ?? []) as VersementPartenaire[],
    total_verse,
  })
}
