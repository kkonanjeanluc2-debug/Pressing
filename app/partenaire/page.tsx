'use client'

import Card from '@/components/ui/Card'
import { formatDateCourte, formatFCFA } from '@/lib/utils'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { DashboardPartenaire } from '@/app/api/partenaire/inscrits/route'

const BADGE_PLAN: Record<string, string> = {
  gratuit: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-700',
  reseau: 'bg-violet-100 text-violet-700',
}

export default function PartenaireDashboardPage() {
  const [data, setData] = useState<DashboardPartenaire | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [contratSigne, setContratSigne] = useState<boolean | null>(null)
  const [copieCopie, setCopieCopie] = useState(false)

  useEffect(() => { void charger() }, [])

  async function charger() {
    setChargement(true)
    const [resInscrits, resProfil] = await Promise.all([
      fetch('/api/partenaire/inscrits'),
      fetch('/api/partenaire/profil'),
    ])
    const jsonInscrits = (await resInscrits.json()) as {
      succes: boolean; dashboard?: DashboardPartenaire; erreur?: string
    }
    const jsonProfil = (await resProfil.json()) as {
      succes: boolean
      partenaire?: { signe_admin: boolean; signe_partenaire: boolean }
    }

    if (!jsonInscrits.succes || !jsonInscrits.dashboard) {
      setErreur(jsonInscrits.erreur ?? 'Impossible de charger les données.')
    } else {
      setData(jsonInscrits.dashboard)
    }

    if (jsonProfil.succes && jsonProfil.partenaire) {
      setContratSigne(jsonProfil.partenaire.signe_admin && jsonProfil.partenaire.signe_partenaire)
    }

    setChargement(false)
  }

  async function copierCode() {
    if (!data) return
    await navigator.clipboard.writeText(data.code_parrainage.toUpperCase())
    setCopieCopie(true)
    setTimeout(() => setCopieCopie(false), 2000)
  }

  if (chargement) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (erreur) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-8 text-center">
        <p className="text-red-700">{erreur}</p>
      </div>
    )
  }

  const d = data!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tableau de bord partenaire</h1>
        <p className="text-sm text-gray-500">Suivi de vos parrainages et commissions</p>
      </div>

      {/* Alerte contrat non signé */}
      {contratSigne === false && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="mt-0.5 text-lg">📋</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-800">Contrat de partenariat en attente</p>
            <p className="text-amber-700">Votre contrat n&apos;est pas encore entièrement signé.</p>
          </div>
          <Link
            href="/partenaire/contrat"
            className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            Voir le contrat
          </Link>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="space-y-2 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-900">{d.nb_inscrits}</p>
          <p className="text-xs text-gray-500">Utilisateurs parrainés</p>
        </Card>

        <Card className="space-y-2 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatFCFA(d.ca_total)}</p>
          <p className="text-xs text-gray-500">CA total généré</p>
        </Card>

        <Card className="space-y-2 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatFCFA(d.commission_estimee)}</p>
          <p className="text-xs text-gray-500">Commission estimée</p>
        </Card>

        <Card className="space-y-2 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2h2z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-900">{d.taux_commission}%</p>
          <p className="text-xs text-gray-500">Taux de commission</p>
        </Card>
      </div>

      {/* Code de parrainage */}
      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">Votre code de parrainage</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-pressci-primary">
            {d.code_parrainage.toUpperCase()}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Transmettez ce code aux pressings lors de leur inscription sur l&apos;application.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copierCode()}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${copieCopie ? 'border-green-500 text-green-600' : 'border-pressci-primary text-pressci-primary hover:bg-pressci-light'}`}
        >
          {copieCopie ? '✓ Copié' : 'Copier'}
        </button>
      </Card>

      {/* Tableau des inscrits */}
      <Card className="p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold text-gray-900">Utilisateurs parrainés</h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {d.nb_inscrits}
          </span>
        </div>

        {d.inscrits.length === 0 ? (
          <div className="border-t border-gray-100 py-12 text-center">
            <p className="text-4xl">👥</p>
            <p className="mt-3 text-sm font-semibold text-gray-500">
              Aucun utilisateur parrainé pour l&apos;instant.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Partagez votre code{' '}
              <span className="font-mono font-bold">{d.code_parrainage.toUpperCase()}</span>{' '}
              lors des inscriptions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-semibold">Utilisateur</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Inscrit le</th>
                  <th className="px-5 py-3 text-right font-semibold">CA généré</th>
                </tr>
              </thead>
              <tbody>
                {d.inscrits.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-800">{u.nom}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_PLAN[u.plan] ?? BADGE_PLAN.gratuit}`}>
                        {u.plan === 'pro' ? 'Pro' : u.plan === 'reseau' ? 'Réseau' : 'Gratuit'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDateCourte(u.created_at)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-800">
                      {formatFCFA(u.montant_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-5 py-3 text-sm font-bold text-gray-700">
                    Total CA · Commission ({d.taux_commission}%)
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="font-bold text-gray-900">{formatFCFA(d.ca_total)}</p>
                    <p className="text-xs font-semibold text-green-600">
                      +{formatFCFA(d.commission_estimee)}
                    </p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
