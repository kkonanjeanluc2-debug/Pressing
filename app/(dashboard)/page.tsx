'use client'

import ActiviteRecente from '@/components/dashboard/ActiviteRecente'
import EcheancesWidget from '@/components/dashboard/EcheancesWidget'
import KpiGrid from '@/components/dashboard/KpiGrid'
import RevenueChart from '@/components/dashboard/RevenueChart'
import CreerPressing from '@/components/onboarding/CreerPressing'
import Card from '@/components/ui/Card'
import PressingSwitcher from '@/components/ui/PressingSwitcher'
import { useDashboard } from '@/hooks/useDashboard'
import { changerPressingActif, usePressing } from '@/hooks/usePressing'
import { usePressingsResume } from '@/hooks/usePressingsResume'
import { useTickets } from '@/hooks/useTickets'
import { formatFCFA } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const { pressing, pressings, chargement: chargementPressing, recharger } = usePressing()
  const { stats, caParSemaine, ticketsPretsNonNotifies, chargement, erreur } = useDashboard(
    pressing?.id ?? null
  )
  const { resumes, totalCaJour } = usePressingsResume(pressings)
  const { tickets } = useTickets(pressing?.id ?? null, 'tous')

  if (chargementPressing || (chargement && !stats && pressing)) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  // Compte sans pressing : création du premier pressing ici (onboarding)
  if (!pressing) {
    return (
      <CreerPressing
        titre="Créer mon pressing"
        sousTitre="Dernière étape avant de commencer"
        surCreation={(id) => {
          changerPressingActif(id)
          recharger()
        }}
      />
    )
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      {/* En-tête mobile : pressing actif + paramètres */}
      <header className="flex items-center justify-between lg:hidden">
        <div>
          <p className="text-sm text-gray-500">Bonjour 👋</p>
          <h1>
            <PressingSwitcher className="text-xl" />
          </h1>
        </div>
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
      </header>

      {/* En-tête desktop : titre + sous-titre */}
      <header className="hidden lg:block">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500">
          Vue d’ensemble de {pressings.length > 1 ? 'vos pressings' : pressing.nom}
        </p>
      </header>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* KPI du pressing actif */}
      {stats && (
        <KpiGrid
          stats={stats}
          depotsJour={resumes.find((r) => r.pressing.id === pressing.id)?.depots_jour ?? 0}
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
                    {p.id === pressing.id && (
                      <span className="ml-2 rounded-full bg-pressci-light px-1.5 py-0.5 text-[10px] font-bold text-pressci-primary">
                        ACTIF
                      </span>
                    )}
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
            Pensez à envoyer le SMS « linge prêt » pour libérer vos portants.
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

      {/* Derniers dépôts avec statut en direct */}
      <ActiviteRecente tickets={tickets} />

      {/* Bouton flottant Nouveau dépôt — mobile uniquement (la sidebar a le sien) */}
      <Link
        href="/tickets/nouveau"
        aria-label="Nouveau dépôt"
        className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-pressci-primary px-5 text-white shadow-lg active:bg-pressci-dark lg:hidden"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="font-semibold">Nouveau dépôt</span>
      </Link>
    </div>
  )
}
