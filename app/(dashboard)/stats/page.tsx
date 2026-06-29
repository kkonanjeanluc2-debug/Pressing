'use client'

import Card from '@/components/ui/Card'
import BlocagePlan from '@/components/ui/BlocagePlan'
import SansPressing from '@/components/ui/SansPressing'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { usePlan } from '@/hooks/usePlan'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import { createClient } from '@/lib/supabase/client'
import { formatDateCourte, formatFCFA, toInputDate } from '@/lib/utils'
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
type Vue = 'apercu' | 'clients'
type Tri = 'dernierDepot' | 'nom' | 'depots' | 'ca'

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

interface ClientAvecStats {
  id: string
  nom: string
  telephone: string
  nombreDepots: number
  dernierDepot: string | null
  caTotal: number
}

const PERIODES: Array<{ id: Periode; label: string }> = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
  { id: 'personnalise', label: 'Personnalisé' },
]

function joursDepuis(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function formatRecence(dateStr: string | null): string {
  const j = joursDepuis(dateStr)
  if (j === null) return 'Jamais'
  if (j === 0) return "Aujourd'hui"
  if (j === 1) return 'Hier'
  if (j < 7) return `Il y a ${j} j`
  if (j < 30) return `Il y a ${Math.floor(j / 7)} sem.`
  if (j < 365) return `Il y a ${Math.floor(j / 30)} mois`
  return `Il y a ${Math.floor(j / 365)} an${Math.floor(j / 365) > 1 ? 's' : ''}`
}

function badgeRecence(dateStr: string | null): { label: string; cls: string; avatar: string } {
  const j = joursDepuis(dateStr)
  if (j === null) return { label: 'Nouveau', cls: 'bg-gray-100 text-gray-600', avatar: 'bg-gray-400' }
  if (j < 30) return { label: 'Actif', cls: 'bg-green-100 text-green-700', avatar: 'bg-pressci-primary' }
  if (j < 60) return { label: 'Silencieux', cls: 'bg-amber-100 text-amber-700', avatar: 'bg-amber-500' }
  return { label: 'À relancer', cls: 'bg-red-100 text-red-700', avatar: 'bg-red-500' }
}

export default function StatsPage() {
  const { pressing, pressings, chargement: chargementPressing } = usePressing()
  const { peut, chargement: chargementProfil } = useProfil()
  const [vue, setVue] = useState<Vue>('apercu')
  const [periode, setPeriode] = useState<Periode>('semaine')
  const [pressingFiltre, setPressingFiltre] = useState<string>('tous')
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState<Tri>('dernierDepot')

  const idsTous = pressings.map((p) => p.id)
  const idsSelection =
    pressingFiltre === 'tous' ? idsTous : idsTous.filter((id) => id === pressingFiltre)
  const [dateDebut, setDateDebut] = useState(toInputDate(new Date(Date.now() - 30 * 86400_000)))
  const [dateFin, setDateFin] = useState(toInputDate(new Date()))

  const nomPressing =
    idsSelection.length === 1
      ? (pressings.find((p) => p.id === idsSelection[0])?.nom ?? 'notre pressing')
      : 'notre pressing'

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

      const compteArticles = new Map<string, number>()
      for (const ligne of (articles.data ?? []) as unknown as LigneArticle[]) {
        compteArticles.set(
          ligne.type_article,
          (compteArticles.get(ligne.type_article) ?? 0) + ligne.quantite
        )
      }

      const compteClients = new Map<string, { nom: string; total: number }>()
      for (const ligne of (ticketsClients.data ?? []) as unknown as LigneTicketClient[]) {
        if (!ligne.client) continue
        const existant = compteClients.get(ligne.client.id)
        compteClients.set(ligne.client.id, {
          nom: ligne.client.nom,
          total: (existant?.total ?? 0) + 1,
        })
      }

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

  // Données complètes clients (non filtrées par période)
  const { donnees: donneesClients, chargement: chargementClients } =
    useDonneesCachees<ClientAvecStats[]>(
      idsSelection.length > 0 ? `clients_stats_${idsSelection.join('_')}` : null,
      async () => {
        const supabase = createClient()
        const [clients, tickets] = await Promise.all([
          supabase
            .from('clients')
            .select('id, nom, telephone, nombre_depots')
            .in('pressing_id', idsSelection)
            .order('nom'),
          supabase
            .from('tickets')
            .select('client_id, date_depot, montant_paye')
            .in('pressing_id', idsSelection)
            .neq('statut', 'annule')
            .order('date_depot', { ascending: false }),
        ])
        if (clients.error || tickets.error) throw clients.error ?? tickets.error

        const statsParClient = new Map<string, { dernierDepot: string; caTotal: number }>()
        for (const t of (tickets.data ?? []) as Array<{
          client_id: string | null
          date_depot: string
          montant_paye: number
        }>) {
          if (!t.client_id) continue
          const ex = statsParClient.get(t.client_id)
          statsParClient.set(t.client_id, {
            dernierDepot: ex?.dernierDepot ?? t.date_depot,
            caTotal: (ex?.caTotal ?? 0) + (t.montant_paye ?? 0),
          })
        }

        return (clients.data ?? []).map((c) => {
          const stats = statsParClient.get(c.id)
          return {
            id: c.id,
            nom: c.nom as string,
            telephone: c.telephone as string,
            nombreDepots: c.nombre_depots as number,
            dernierDepot: stats?.dernierDepot ?? null,
            caTotal: stats?.caTotal ?? 0,
          }
        })
      },
      'Impossible de charger la liste des clients.'
    )

  const { planAutorise, chargement: chargementPlan } = usePlan(pressing?.owner_id ?? null)

  // Tous les hooks AVANT les early returns
  const encaissements = donnees?.encaissements ?? []
  const topArticles = donnees?.topArticles ?? []
  const topClients = donnees?.topClients ?? []
  const tauxFidelisation = donnees?.tauxFidelisation ?? 0

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

  const tousClients = donneesClients ?? []
  const rechercheNorm = recherche.trim().toLowerCase()
  const clientsFiltres = useMemo(() => {
    let liste = rechercheNorm
      ? tousClients.filter(
          (c) =>
            c.nom.toLowerCase().includes(rechercheNorm) ||
            c.telephone.includes(rechercheNorm)
        )
      : [...tousClients]

    if (tri === 'nom') liste.sort((a, b) => a.nom.localeCompare(b.nom))
    else if (tri === 'depots') liste.sort((a, b) => b.nombreDepots - a.nombreDepots)
    else if (tri === 'ca') liste.sort((a, b) => b.caTotal - a.caTotal)
    else {
      // dernierDepot : les plus récents en premier, jamais venus en dernier
      liste.sort((a, b) => {
        if (!a.dernierDepot && !b.dernierDepot) return 0
        if (!a.dernierDepot) return 1
        if (!b.dernierDepot) return -1
        return new Date(b.dernierDepot).getTime() - new Date(a.dernierDepot).getTime()
      })
    }
    return liste
  }, [tousClients, rechercheNorm, tri])

  // Early returns après tous les hooks
  if (chargementPressing) return <div className="flex justify-center py-16"><span className="spinner spinner-dark h-8 w-8" /></div>
  if (!pressing) return <SansPressing />
  if (chargementPlan) return <div className="flex justify-center py-16"><span className="spinner spinner-dark h-8 w-8" /></div>
  if (!planAutorise('pro')) return <BlocagePlan planRequis="pro" fonctionnalite="Les statistiques avancées" />

  if (!chargementProfil && !peut('voir_stats')) {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🔒</p>
        <p className="font-semibold">Accès non autorisé.</p>
        <p className="mt-1 text-sm">
          Le propriétaire ne vous a pas donné l'accès aux rapports.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-pressci-dark lg:text-2xl">Rapports</h1>
        <Link href="/caisse" className="text-sm font-semibold text-pressci-primary">
          Caisse du jour →
        </Link>
      </header>

      {/* Filtre par pressing */}
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

      {/* Onglets principaux */}
      <div className="flex rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setVue('apercu')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            vue === 'apercu'
              ? 'bg-white text-pressci-dark shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Vue d&apos;ensemble
        </button>
        <button
          onClick={() => setVue('clients')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            vue === 'clients'
              ? 'bg-white text-pressci-dark shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Clients{tousClients.length > 0 ? ` (${tousClients.length})` : ''}
        </button>
      </div>

      {/* ===================== VUE D'ENSEMBLE ===================== */}
      {vue === 'apercu' && (
        <>
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
                  <p className="text-sm text-gray-500">Chiffre d&apos;affaires de la période</p>
                  <p className="text-2xl font-bold text-pressci-dark">{formatFCFA(totalPeriode)}</p>
                </Card>

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

              <Card className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">Taux de fidélisation</h2>
                  <p className="text-xs text-gray-500">Clients revenus au moins 2 fois</p>
                </div>
                <span className="text-2xl font-bold text-pressci-primary">{tauxFidelisation}%</span>
              </Card>
            </>
          )}
        </>
      )}

      {/* ===================== VUE CLIENTS ===================== */}
      {vue === 'clients' && (
        <div className="space-y-4">
          {/* Légende recence */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-green-700 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Actif &lt; 30 j
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Silencieux 30–60 j
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-red-700 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> À relancer &gt; 60 j
            </span>
          </div>

          {/* Recherche */}
          <input
            type="search"
            placeholder="Rechercher par nom ou téléphone…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent"
          />

          {/* Tri */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {(
              [
                { id: 'dernierDepot', label: 'Dernier dépôt' },
                { id: 'depots', label: 'Nb dépôts' },
                { id: 'ca', label: 'CA total' },
                { id: 'nom', label: 'Nom A→Z' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTri(t.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                  tri === t.id
                    ? 'bg-pressci-primary text-white'
                    : 'border border-gray-300 bg-white text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {chargementClients ? (
            <div className="flex justify-center py-10">
              <span className="spinner spinner-dark h-8 w-8" />
            </div>
          ) : clientsFiltres.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <p className="text-4xl">👥</p>
              <p className="mt-2">Aucun client trouvé.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientsFiltres.map((c) => {
                const badge = badgeRecence(c.dernierDepot)
                const j = joursDepuis(c.dernierDepot)
                const tel = c.telephone.replace(/\D/g, '').replace(/^225/, '')
                const msgRelance = `Bonjour ${c.nom}, nous espérons que vous allez bien ! Cela fait un moment que nous n'avons pas eu le plaisir de vous accueillir au ${nomPressing}. N'hésitez pas à nous déposer vos articles, nous serons ravis de vous revoir ! 🙏`
                const lienWa = `https://wa.me/225${tel}?text=${encodeURIComponent(msgRelance)}`

                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-card border border-gray-200 bg-white p-4"
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${badge.avatar}`}
                    >
                      {c.nom.charAt(0).toUpperCase()}
                    </div>

                    {/* Infos */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-gray-900">{c.nom}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{c.telephone}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-400">
                        <span>{c.nombreDepots} dépôt{c.nombreDepots > 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>CA {formatFCFA(c.caTotal)}</span>
                        {c.dernierDepot && (
                          <>
                            <span>·</span>
                            <span title={formatDateCourte(c.dernierDepot)}>
                              Dernier : {formatRecence(c.dernierDepot)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Bouton relance WhatsApp */}
                    {c.telephone && (j === null || j >= 30) && (
                      <a
                        href={lienWa}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Relancer ${c.nom} sur WhatsApp`}
                        className="shrink-0 rounded-full bg-[#25D366] px-3 py-2 text-xs font-semibold text-white active:brightness-90"
                      >
                        💬 Relancer
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
