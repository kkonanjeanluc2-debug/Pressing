import { verifierSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import type { ActiviteAdmin } from '@/types'

/** GET /api/admin/activite — derniers événements de toute la plateforme. */
export async function GET(): Promise<NextResponse> {
  if (!(await verifierSuperAdmin())) {
    return NextResponse.json({ succes: false, erreur: 'Accès réservé' }, { status: 403 })
  }

  const admin = createAdminClient()
  const [tickets, encaissements] = await Promise.all([
    admin
      .from('tickets')
      .select('numero, statut, montant_total, created_at, pressing:pressings(nom)')
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('encaissements')
      .select('montant, mode_paiement, created_at, pressing:pressings(nom)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const activite: ActiviteAdmin = {
    tickets: (
      (tickets.data ?? []) as unknown as Array<{
        numero: string
        statut: string
        montant_total: number
        created_at: string
        pressing: { nom: string } | null
      }>
    ).map((t) => ({
      numero: t.numero,
      statut: t.statut,
      montant_total: t.montant_total,
      created_at: t.created_at,
      pressing: t.pressing?.nom ?? '—',
    })),
    encaissements: (
      (encaissements.data ?? []) as unknown as Array<{
        montant: number
        mode_paiement: string
        created_at: string
        pressing: { nom: string } | null
      }>
    ).map((e) => ({
      montant: e.montant,
      mode_paiement: e.mode_paiement,
      created_at: e.created_at,
      pressing: e.pressing?.nom ?? '—',
    })),
  }

  return NextResponse.json({ succes: true, activite })
}
