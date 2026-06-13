'use client'

import ActiviteRecente from '@/components/dashboard/ActiviteRecente'
import EcheancesWidget from '@/components/dashboard/EcheancesWidget'
import KpiGrid from '@/components/dashboard/KpiGrid'
import RevenueChart from '@/components/dashboard/RevenueChart'
import CreerPressing from '@/components/onboarding/CreerPressing'
import Card from '@/components/ui/Card'
import { useDashboard } from '@/hooks/useDashboard'
import { usePlan } from '@/hooks/usePlan'
import { usePressing } from '@/hooks/usePressing'
import { usePressingsResume } from '@/hooks/usePressingsResume'
import { useProfil } from '@/hooks/useProfil'
import { useTickets } from '@/hooks/useTickets'
import { viderCache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import { formatFCFA, formatHeure } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const [retourPaiement, setRetourPaiement] = useState<
    'pro' | 'reseau' | 'en_attente' | null
  >(null)
  const [paiementEnCours, setPaiementEnCours] = useState(false)

  // Retour de paiement GeniusPay : afficher la confirmation d'abonnement.
  // Le webhook peut mettre quelques secondes : on revérifie plusieurs fois.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('paiement') !== 'succes') return
    window.history.replaceState({}, '', '/')

    let annule = false
    let tentatives = 0
    async function verifierActivation() {
      tentatives++
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || annule) return
      const { data } = await supabase
        .from('abonnements')
        .select('plan')
        .eq('owner_id', user.id)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (annule) return
      if (data?.plan === 'pro' || data?.plan === 'reseau') {
        setRetourPaiement(data.plan as 'pro' | 'reseau')
        viderCache()
      } else if (tentatives < 6) {
        setRetourPaiement('en_attente')
        setTimeout(() => void verifierActivation(), 3000)
      }
    }
    void verifierActivation()
    return () => {
      annule = true
    }
  }, [])
  const { pressing, pressings, chargement: chargementPressing, recharger } = usePressing()
  const { role, agent, peut } = useProfil()
  const { plan, planAutorise } = usePlan(pressings[0]?.owner_id ?? null)

  async function passerAuPro() {
    setPaiementEnCours(true)
    try {
      const res = await fetch('/api/abonnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      const data = (await res.json()) as { succes: boolean; url?: string }
      if (data.succes && data.url) {
        window.location.href = data.url
        return
      }
    } catch {
      // silencieux — l'utilisateur peut aller dans parametres
    }
    setPaiementEnCours(false)
  }

  async function seDeconnecterAgent() {
    const supabase = createClient()
    if (agent) {
      await supabase.rpc('fermer_pressing', { p_pressing_id: agent.pressing_id })
    }
    await supabase.auth.signOut()
    viderCache()
    router.push('/login')
    router.refresh()
  }
  // Tableau de bord COMMUN : agrégé sur tous les pressings du propriétaire
  // (un agent n'a accès qu'à son pressing via RLS)
  const idsPressings = pressings.map((p) => p.id)
  const { stats, caParSemaine, ticketsPretsNonNotifies, chargement, erreur } =
    useDashboard(idsPressings)
  const { resumes, totalCaJour } = usePressingsResume(pressings)
  const { tickets } = useTickets(idsPressings.length > 0 ? idsPressings : null, 'tous')

  if (chargementPressing || (chargement && !stats && pressing)) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  // Compte sans pressing : création du premier pressing ici (onboarding).
  // Un agent sans pressing visible = accès suspendu par le propriétaire.
  if (!pressing) {
    if (role === 'agent') {
      return (
        <div className="px-4 py-16 text-center text-gray-600">
          <p className="mb-2 text-4xl">🔒</p>
          <p className="font-semibold">Votre accès agent est suspendu.</p>
          <p className="mt-1 text-sm">Contactez le propriétaire du pressing.</p>
        </div>
      )
    }
    return (
      <CreerPressing
        titre="Créer mon pressing"
        sousTitre="Dernière étape avant de commencer"
        surCreation={() => recharger()}
      />
    )
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      {/* Bannière plan gratuit */}
      {plan === 'gratuit' && role === 'proprietaire' && !planAutorise('pro') && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚡</span>
            <div className="text-sm">
              <span className="font-semibold text-amber-800">Forfait Gratuit</span>
              <span className="ml-2 text-amber-600">· 20 tickets/mois · 1 pressing</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void passerAuPro()}
            disabled={paiementEnCours}
            className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {paiementEnCours ? '…' : 'Passer au Pro'}
          </button>
        </div>
      )}

      {/* En-tête mobile */}
      <header className="flex items-center justify-between lg:hidden">
        <div>
          <p className="text-sm text-gray-500">Bonjour 👋</p>
          <h1 className="text-xl font-bold text-pressci-dark">
            {pressings.length > 1 ? 'Vos pressings' : pressing.nom}
          </h1>
        </div>
        {role === 'proprietaire' ? (
          <Link
            href="/parametres"
            aria-label="Paramètres"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-pressci-light text-pressci-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void seDeconnecterAgent()}
            aria-label="Déconnexion"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </header>

      {/* En-tête desktop : titre + sous-titre */}
      <header className="hidden lg:block">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500">
          {pressings.length > 1
            ? `Vue d’ensemble de vos ${pressings.length} pressings`
            : `Vue d’ensemble de ${pressing.nom}`}
        </p>
      </header>

      {/* Confirmation d'abonnement après paiement GeniusPay */}
      {retourPaiement && (
        <div
          className={`flex items-start justify-between gap-3 rounded-card border p-4 ${
            retourPaiement === 'en_attente'
              ? 'border-amber-300 bg-amber-50'
              : 'border-green-300 bg-green-50'
          }`}
        >
          {retourPaiement === 'en_attente' ? (
            <p className="text-sm font-medium text-amber-800">
              ⏳ Paiement reçu — l’activation de votre abonnement est en cours, elle sera
              confirmée dans quelques instants…
            </p>
          ) : (
            <p className="text-sm font-medium text-green-800">
              🎉 Paiement confirmé ! Votre abonnement{' '}
              <strong>{retourPaiement === 'pro' ? 'Pro' : 'Réseau'}</strong> est activé pour
              votre compte.
            </p>
          )}
          <button
            type="button"
            onClick={() => setRetourPaiement(null)}
            aria-label="Fermer"
            className="shrink-0 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* KPI globaux (tous pressings) */}
      {stats && (
        <KpiGrid
          stats={stats}
          depotsJour={resumes.reduce((s, r) => s + r.depots_jour, 0)}
          nbPressings={pressings.length}
        />
      )}

      {/* CA global du jour, détaillé par pressing */}
      {pressings.length > 1 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pressci-light text-pressci-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">CA du jour — tous pressings</p>
                <p className="text-xl font-bold text-gray-900">{formatFCFA(totalCaJour)}</p>
              </div>
            </div>
            <Link href="/pressings" className="shrink-0 text-sm font-semibold text-pressci-primary">
              Détail par pressing →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
            {resumes.map(({ pressing: p, ca_jour, creances, tickets_actifs }) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8" />
                    </svg>
                  </span>
                  <span className="truncate text-sm font-medium text-gray-800">
                    {p.nom}
                    <span
                      className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        p.ouvert ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.ouvert
                        ? `OUVERT${p.ouvert_depuis ? ` · ${formatHeure(p.ouvert_depuis)}` : ''}`
                        : `FERMÉ${p.ferme_a ? ` · ${formatHeure(p.ferme_a)}` : ''}`}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span className="font-semibold text-green-600">+{formatFCFA(ca_jour)}</span>
                  {creances > 0 && (
                    <span className="hidden font-semibold text-red-500 sm:inline">
                      -{formatFCFA(creances)}
                    </span>
                  )}
                  <span className="hidden text-gray-400 md:inline">
                    {tickets_actifs} actif{tickets_actifs > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alerte : tickets prêts non notifiés depuis plus de 24h */}
      {ticketsPretsNonNotifies.length > 0 && (
        <div className="rounded-card border border-red-200 bg-red-50 p-4">
          <p className="mb-2 flex items-center gap-2 font-semibold text-red-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Tickets prêts non notifiés ({ticketsPretsNonNotifies.length})
          </p>
          <div className="divide-y divide-red-100">
            {ticketsPretsNonNotifies.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-gray-700">
                  <span className="font-semibold">{t.numero}</span> — {t.client?.nom ?? 'Client'}
                </span>
                <span className="font-semibold text-red-600">{formatFCFA(t.montant_total)}</span>
              </Link>
            ))}
          </div>
          <p className="mt-1 text-xs text-red-600">
            Pensez à notifier les clients sur WhatsApp (« linge prêt ») pour libérer vos portants.
          </p>
        </div>
      )}

      <div className="space-y-4 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-4 lg:space-y-0">
        <div className="lg:col-span-2">
          <RevenueChart donnees={caParSemaine} />
        </div>

        {/* Échéances : tickets en retard / à livrer aujourd'hui */}
        <EcheancesWidget tickets={tickets} />
      </div>

      {/* Derniers dépôts avec statut en direct, organisés par pressing */}
      <ActiviteRecente tickets={tickets} pressings={pressings} />

      {/* Bouton flottant Nouveau dépôt — mobile uniquement */}
      {peut('creer_tickets') && (
        <Link
          href="/tickets/nouveau"
          aria-label="Nouveau dépôt"
          className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-pressci-primary px-5 text-white shadow-lg active:bg-pressci-dark lg:hidden"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="font-semibold">Nouveau dépôt</span>
        </Link>
      )}
    </div>
  )
}
