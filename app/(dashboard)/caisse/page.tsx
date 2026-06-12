'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { usePressing } from '@/hooks/usePressing'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatFCFA, MODE_PAIEMENT_LABELS } from '@/lib/utils'
import type { ModePaiement } from '@/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface EncaissementAvecTicket {
  id: string
  montant: number
  mode_paiement: ModePaiement
  created_at: string
  ticket?: { numero: string; client?: { nom: string } }
}

function debutJour(decalageJours = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + decalageJours)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function CaissePage() {
  const { pressing } = usePressing()
  const [encaissements, setEncaissements] = useState<EncaissementAvecTicket[]>([])
  const [totalHier, setTotalHier] = useState(0)
  const [moyenneSemaine, setMoyenneSemaine] = useState(0)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!pressing) return
    const supabase = createClient()

    async function charger() {
      if (!pressing) return
      const [jour, semaine] = await Promise.all([
        supabase
          .from('encaissements')
          .select('*, ticket:tickets(numero, client:clients(nom))')
          .eq('pressing_id', pressing.id)
          .gte('created_at', debutJour().toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('encaissements')
          .select('montant, created_at')
          .eq('pressing_id', pressing.id)
          .gte('created_at', debutJour(-7).toISOString())
          .lt('created_at', debutJour().toISOString()),
      ])

      if (jour.error || semaine.error) {
        setErreur('Impossible de charger la caisse. Vérifiez votre réseau.')
        setChargement(false)
        return
      }

      setEncaissements((jour.data ?? []) as EncaissementAvecTicket[])

      const lignes = (semaine.data ?? []) as Array<{ montant: number; created_at: string }>
      const hier = lignes
        .filter((e) => new Date(e.created_at) >= debutJour(-1))
        .reduce((s, e) => s + e.montant, 0)
      setTotalHier(hier)
      setMoyenneSemaine(Math.round(lignes.reduce((s, e) => s + e.montant, 0) / 7))
      setChargement(false)
    }

    void charger()
  }, [pressing])

  const totalJour = encaissements.reduce((s, e) => s + e.montant, 0)
  const parMode = encaissements.reduce<Partial<Record<ModePaiement, number>>>((acc, e) => {
    acc[e.mode_paiement] = (acc[e.mode_paiement] ?? 0) + e.montant
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5 print:px-0">
      <header className="flex items-center gap-3 print:hidden">
        <Link
          href="/"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-pressci-dark">Caisse du jour</h1>
          <p className="text-sm text-gray-500">{formatDate(new Date())}</p>
        </div>
      </header>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : (
        <>
          {/* Total du jour */}
          <Card className="bg-pressci-primary text-center text-white">
            <p className="text-sm opacity-80">Total encaissé aujourd’hui</p>
            <p className="text-3xl font-bold">{formatFCFA(totalJour)}</p>
            <div className="mt-3 flex justify-around border-t border-white/20 pt-3 text-xs">
              <div>
                <p className="opacity-70">Hier</p>
                <p className="font-semibold">{formatFCFA(totalHier)}</p>
              </div>
              <div>
                <p className="opacity-70">Moyenne / jour (7j)</p>
                <p className="font-semibold">{formatFCFA(moyenneSemaine)}</p>
              </div>
            </div>
          </Card>

          {/* Totaux par mode de paiement */}
          <div className="grid grid-cols-3 gap-3">
            {(['cash', 'wave', 'orange_money'] as ModePaiement[]).map((mode) => (
              <Card key={mode} className="text-center">
                <p className="text-xs text-gray-500">{MODE_PAIEMENT_LABELS[mode]}</p>
                <p className="text-sm font-bold text-pressci-dark">
                  {formatFCFA(parMode[mode] ?? 0)}
                </p>
              </Card>
            ))}
          </div>

          {/* Liste des encaissements */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Encaissements ({encaissements.length})
            </h2>
            {encaissements.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                Aucun encaissement aujourd’hui pour l’instant.
              </p>
            ) : (
              <div className="space-y-2">
                {encaissements.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-card border border-gray-200 bg-white p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {e.ticket?.numero ?? ''} · {e.ticket?.client?.nom ?? 'Client'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(e.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {MODE_PAIEMENT_LABELS[e.mode_paiement]}
                      </p>
                    </div>
                    <span className="font-semibold text-green-700">+{formatFCFA(e.montant)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="print:hidden">
            <Button pleineLargeur variante="outline" onClick={() => window.print()}>
              🧾 Clôturer la journée (imprimer / PDF)
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
