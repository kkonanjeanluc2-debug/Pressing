import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** GET — profil du partenaire connecté (contrat inclus) */
export async function GET(): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ succes: false, erreur: 'Non authentifié' }, { status: 401 })

  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const { data, error } = await admin
    .from('partenaires')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ succes: false, erreur: 'Non partenaire' }, { status: 404 })
  if ((data.statut as string) !== 'actif') {
    return NextResponse.json({ succes: false, erreur: 'Compte partenaire suspendu.' }, { status: 403 })
  }

  return NextResponse.json({ succes: true, partenaire: data })
}
