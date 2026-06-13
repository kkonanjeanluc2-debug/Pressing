'use client'

import { useState } from 'react'

interface BlocagePlanProps {
  planRequis: 'pro' | 'reseau'
  fonctionnalite?: string
}

export default function BlocagePlan({ planRequis, fonctionnalite }: BlocagePlanProps) {
  const [enCours, setEnCours] = useState(false)
  const label = planRequis === 'reseau' ? 'Réseau' : 'Pro'
  const prix = planRequis === 'reseau' ? '12 000 FCFA/mois' : '5 000 FCFA/mois'

  async function souscrire() {
    setEnCours(true)
    try {
      const res = await fetch('/api/abonnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planRequis }),
      })
      const data = (await res.json()) as { succes: boolean; url?: string }
      if (data.succes && data.url) {
        window.location.href = data.url
        return
      }
    } catch {
      // silencieux
    }
    setEnCours(false)
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 ring-4 ring-amber-100">
        <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-gray-900">
        {fonctionnalite ? fonctionnalite : 'Cette fonctionnalité'} est réservée au plan {label}
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Votre forfait actuel (Gratuit) ne donne pas accès à cette section.
        Passez au plan <span className="font-semibold text-pressci-primary">{label}</span> pour en profiter.
      </p>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-left">
        <p className="text-xs font-semibold uppercase text-amber-600">Plan {label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{prix}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
          {planRequis === 'pro' && (
            <>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Tickets illimités</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Comptabilité SYSCOHADA</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Rapports & statistiques</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Notifications WhatsApp</li>
            </>
          )}
          {planRequis === 'reseau' && (
            <>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Tout le plan Pro</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Pressings illimités</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Tableau de bord multi-site</li>
            </>
          )}
        </ul>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => void souscrire()}
          disabled={enCours}
          className="rounded-full bg-pressci-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-pressci-dark disabled:opacity-60"
        >
          {enCours ? 'Redirection…' : `Passer au plan ${label}`}
        </button>
      </div>
    </div>
  )
}
