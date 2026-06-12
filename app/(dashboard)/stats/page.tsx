'use client'

import Card from '@/components/ui/Card'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import { createClient } from '@/lib/supabase/client'
import { formatFCFA, toInputDate } from '@/lib/utils'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Periode = 'jour' | 'semaine' | 'mois' | 'personnalise'

interface PointCA {
  label: string
  montant: number
}

interface LigneEncaissement {
  montant: number
  created_at: string
}

interface LigneArticle {
  type_article: string
  quantite: number
  ticket: { pressing_id: string; date_depot: string } | null
}

interface LigneTicketClient {
  client: { id: string; nom: string } | null
}

interface DonneesStats {
  encaissements: LigneEncaissement[]
  topArticles: Array<{ nom: string; total: number }>
  topClients: Array<{ nom: string; total: number }>
  tauxFidelisation: number
}

const PERIODES: Array<{ id: Periode; label: string }> = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
  { id: 'personnalise', label: 'Personnalisé' },
]

export default function StatsPage() {
  const { pressings } = usePressing()
  const { peut, chargement: chargementProfil } = useProfil()
  const [periode, setPeriode] = useState<Periode>('semaine')
  const [pressingFiltre, setPressingFiltre] = useState<string>('tous')

  const idsTous = pressings.map((p) => p.id)
  const idsSelection =
    pressingFiltre === 'tous' ? idsTous : idsTous.filter((id) => id === pressingFiltre)
  const [dateDebut, setDateDebut] = useState(toInputDate(new Date(Date.now() - 30 * 86400_000)))
  const [dateFin, setDateFin] = useState(toInputDate(new Date()))

  // Bornes de la période sélectionnée
  const bornes = useMemo((): { debut: Date; fin: Date } => {
    const maintenant = new Date()
    const fin = new Date(maintenant)
    fin.setHours(23, 59, 59, 999)
    const debut = new Date(maintenant)
    debut.setHours(0, 0, 0, 0)

    if (periode === 'jour') {
      debut.setDate(debut.getDate() - 13)
    } else if (periode === 'semaine') {
      debut.setDate(debut.getDate() - 7 * 8)
    } else if (periode === 'mois') {
      debut.setMonth(debut.getMonth() - 5, 1)
    } else {
      return {
        debut: new Date(`${dateDebut}T00:00:00`),
        fin: new Date(`${dateFin}T23:59:59`),
      }
    }
    return { debut, fin }
  }, [periode, dateDebut, dateFin])

  const { donnees, chargement, erreur } = useDonneesCachees<DonneesStats>(
    idsSelection.length > 0
      ? `stats_${idsSelection.join('_')}_${periode}_${toInputDate(bornes.debut)}_${toInputDate(bornes.fin)}`
      : null,
    async () => {
      const supabase = createClient()

      const [enc, articles, ticketsClients, clientsTous] = await Promise.all([
        supabase
          .from('encaissements')
          .select('montant, created_at')
          .in('pressing_id', idsSelection)
          .gte('created_at', bornes.debut.toISOString())
          .lte('created_at', bornes.fin.toISOString()),
        supabase
          .from('articles_ticket')
          .select('type_article, quantite, ticket:tickets!inner(pressing_id, date_depot)')
          .in('ticket.pressing_id', idsSelection)
          .gte('ticket.date_depot', bornes.debut.toISOString())
          .lte('ticket.date_depot', bornes.fin.toISOString()),
        supabase
          .from('tickets')
          .select('client:clients(id, nom)')
          .in('pressing_id', idsSelection)
          .neq('statut', 'annule')
          .gte('date_depot', bornes.debut.toISOString())
          .lte('date_depot', bornes.fin.toISOString()),
        supabase
          .from('clients')
          .select('nombre_depots')
          .in('pressing_id', idsSelection),
      ])

      if (enc.error || articles.error || ticketsClients.error || clientsTous.error) {
        throw enc.error ?? articles.error ?? ticketsClients.error ?? clientsTous.error
      }

      // Top 5 articles
      const compteArticles = new Map<string, number>()
      for (const ligne of (articles.data ?? []) as unknown as LigneArticle[]) {
        compteArticles.set(
          ligne.type_article,
          (compteArticles.get(ligne.type_article) ?? 0) + ligne.quantite
        )
      }

      // Top 5 clients par volume de dépôts
      const compteClients = new Map<string, { nom: string; total: number }>()
      for (const ligne of (ticketsClients.data ?? []) as unknown as LigneTicketClient[]) {
        if (!ligne.client) continue
        const existant = compteClients.get(ligne.client.id)
        compteClients.set(ligne.client.id, {
          nom: ligne.client.nom,
          total: (existant?.total ?? 0) + 1,
        })
      }

      // Taux de fidélisation : clients avec 2+ dépôts
      const tous = (clientsTous.data ?? []) as Array<{ nombre_depots: number }>
      const fideles = tous.filter((c) => c.nombre_depots >= 2).length

      return {
        encaissements: (enc.data ?? []) as LigneEncaissement[],
        topArticles: [...compteArticles.entries()]
          .map(([nom, total]) => ({ nom, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5),
        topClients: [...compteClients.values()]
          .sort((a, b) => b.total - a.total)
          .slice(0, 5),
        tauxFidelisation: tous.length > 0 ? Math.round((fideles / tous.length) * 100) : 0,
      }
    },
    'Impossible de charger les statistiques. Vérifiez votre réseau.'
  )

  if (!chargementProfil && !peut('voir_stats')) {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🔒</p>
        <p className="font-semibold">Accès non autorisé.</p>
        <p className="mt-1 text-sm">
          Le propriétaire ne vous a pas donné l’accès aux rapports.
        </p>
      </div>
    )
  }

  const encaissements = donnees?.encaissements ?? []
  const topArticles = donnees?.topArticles ?? []
  const topClients = donnees?.topClients ?? []
  const tauxFidelisation = donnees?.tauxFidelisation ?? 0

  // Agrégation du CA par point du graphique
  const pointsCA = useMemo((): PointCA[] => {
    const points = new Map<string, number>()
    const formatPoint = (d: Date): string => {
      if (periode === 'jour' || periode === 'personnalise') {
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      }
      if (periode === 'semaine') {
        const debutSem = new Date(d)
        debutSem.setDate(d.getDate() - ((d.getDay() + 6) % 7))
        return debutSem.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      }
      return d.toLocaleDateString('fr-FR', { month: 'short' })
    }

    // Pré-remplir les points vides pour un graphique continu
    const curseur = new Date(bornes.debut)
    while (curseur <= bornes.fin) {
      points.set(formatPoint(curseur), 0)
      curseur.setDate(curseur.getDate() + 1)
    }

    for (const e of encaissements) {
      const cle = formatPoint(new Date(e.created_at))
      points.set(cle, (points.get(cle) ?? 0) + e.montant)
    }

    return [...points.entries()].map(([label, montant]) => ({ label, montant }))
  }, [encaissements, periode, bornes])

  const totalPeriode = encaissements.reduce((s, e) => s + e.montant, 0)

  return (
    <div className="space-y-4 px-4 pt-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-pressci-dark lg:text-2xl">Rapports</h1>
        <Link href="/caisse" className="text-sm font-semibold text-pressci-primary">
          Caisse du jour →
        </Link>
      </header>

      {/* Filtre par pressing (propriétaire multi-pressings) */}
      {pressings.length > 1 && (
        <select
          value={pressingFiltre}
          onChange={(e) => setPressingFiltre(e.target.value)}
          aria-label="Filtrer par pressing"
          className="w-full rounded-card border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-pressci-primary lg:max-w-xs"
        >
          <option value="tous">Tous les pressings</option>
          {pressings.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
              {p.commune ? ` — ${p.commune}` : ''}
            </option>
          ))}
        </select>
      )}

      {/* Sélecteur de période */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {PERIODES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriode(p.id)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
              periode === p.id
                ? 'bg-pressci-primary text-white'
                : 'border border-gray-300 bg-white text-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periode === 'personnalise' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Du</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full rounded-card border border-gray-300 px-3 py-2.5 outline-none focus:border-pressci-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Au</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full rounded-card border border-gray-300 px-3 py-2.5 outline-none focus:border-pressci-primary"
            />
          </div>
        </div>
      )}

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : (
        <>
          <div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
            <Card className="flex flex-col justify-center text-center">
              <p className="text-sm text-gray-500">Chiffre d’affaires de la période</p>
              <p className="text-2xl font-bold text-pressci-dark">{formatFCFA(totalPeriode)}</p>
            </Card>

            {/* Graphique d'évolution */}
            <Card className="lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Évolution du CA</h2>
              <div className="h-48 lg:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pointsCA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(valeur) => [formatFCFA(Number(valeur)), 'CA']}
                      labelStyle={{ color: '#085041' }}
                    />
                    <Bar dataKey="montant" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {/* Top articles */}
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Top 5 articles traités</h2>
              {topArticles.length === 0 ? (
                <p className="text-sm text-gray-500">Pas encore de données.</p>
              ) : (
                <ul className="space-y-2">
                  {topArticles.map((a, i) => (
                    <li key={a.nom} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="mr-2 font-bold text-pressci-primary">{i + 1}.</span>
                        {a.nom}
                      </span>
                      <span className="font-semibold">{a.total} pièces</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Top clients */}
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Top 5 clients par volume</h2>
              {topClients.length === 0 ? (
                <p className="text-sm text-gray-500">Pas encore de données.</p>
              ) : (
                <ul className="space-y-2">
                  {topClients.map((c, i) => (
                    <li key={c.nom} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="mr-2 font-bold text-pressci-primary">{i + 1}.</span>
                        {c.nom}
                      </span>
                      <span className="font-semibold">
                        {c.total} dépôt{c.total > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Fidélisation */}
          <Card className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Taux de fidélisation</h2>
              <p className="text-xs text-gray-500">Clients revenus au moins 2 fois</p>
            </div>
            <span className="text-2xl font-bold text-pressci-primary">{tauxFidelisation}%</span>
          </Card>
        </>
      )}
    </div>
  )
}
