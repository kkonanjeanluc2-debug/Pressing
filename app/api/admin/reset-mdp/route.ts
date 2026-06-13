import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** POST /api/admin/reset-mdp — génère un lien de réinitialisation de mot de passe. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const { email } = (await request.json()) as { email: string }
  if (!email) {
    return NextResponse.json({ succes: false, erreur: 'Email requis' }, { status: 400 })
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ succes: false, erreur: (e as Error).message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pressing-delta.vercel.app'

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${appUrl}/login` },
  })

  if (error) {
    return NextResponse.json({ succes: false, erreur: error.message }, { status: 500 })
  }

  const lien = (data as { properties?: { action_link?: string } })?.properties?.action_link ?? null

  return NextResponse.json({ succes: true, lien })
}
