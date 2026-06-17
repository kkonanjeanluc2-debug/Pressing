import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ status: 'non_connecte', user: null, logo_url: null })
    }

    const { data: profil, error: profilError } = await supabase
      .from('profils')
      .select('logo_url, nom')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      status: 'connecte',
      user_id: user.id,
      email: user.email,
      profil_trouve: !!profil,
      profil_error: profilError?.message ?? null,
      logo_url: profil?.logo_url ?? null,
      nom: profil?.nom ?? null,
      icone_manifest: (profil?.logo_url as string | null)?.split('?')[0] ?? '/icons/icon-192.png',
    })
  } catch (e) {
    return NextResponse.json({ status: 'erreur', message: String(e) })
  }
}
