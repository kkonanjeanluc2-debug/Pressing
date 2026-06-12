'use client'

import { usePressing } from '@/hooks/usePressing'
import { usePressingsResume } from '@/hooks/usePressingsResume'
import { formatFCFA } from '@/lib/utils'
import Link from 'next/link'

export default function PressingsPage() {
  const { pressing: pressingActif, pressings, chargement } = usePressing()
  const { resumes, chargement: chargementResumes } = usePressingsResume(pressings)

  if (chargement) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      {/* En-tête */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-pressci-dark lg:text-2xl">Pressings</h1>
          <p className="text-sm text-gray-500">
            {pressings.length} pressing{pressings.length > 1 ? 's' : ''} configuré
            {pressings.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/pressings/nouveau"
          className="shrink-0 rounded-card bg-pressci-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pressci-secondary"
        >
          + Nouveau pressing
        </Link>
      </header>

      {pressings.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          <p className="mb-2 text-4xl">🧺</p>
          <p>Aucun pressing pour l’instant.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(resumes.length > 0
            ? resumes
            : pressings.map((p) => ({
                pressing: p,
                ca_jour: 0,
                depots_jour: 0,
                creances: 0,
                tickets_actifs: 0,
              }))
          ).map(({ pressing, ca_jour, depots_jour, creances, tickets_actifs }) => {
            const actif = pressing.id === pressingActif?.id
            return (
              <Link
                key={pressing.id}
                href={`/pressings/${pressing.id}`}
                className={`block rounded-card border bg-white p-4 transition-shadow hover:shadow-md ${
                  actif ? 'border-pressci-primary ring-1 ring-pressci-primary' : 'border-gray-200'
                }`}
              >
                {/* Nom + badge */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pressci-light text-pressci-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M9 21v-6h6v6" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{pressing.nom}</p>
                      <p className="text-xs text-gray-500">
                        {tickets_actifs} ticket{tickets_actifs > 1 ? 's' : ''} actif
                        {tickets_actifs > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {actif && (
                    <span className="rounded-full bg-pressci-primary px-2 py-0.5 text-[10px] font-bold text-white">
                      ACTIF
                    </span>
                  )}
                </div>

                {/* Coordonnées */}
                <div className="mb-3 space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <span aria-hidden>📍</span>
                    {[pressing.adresse, pressing.commune].filter(Boolean).join(', ') || '—'}
                  </p>
                  <p className="flex items-center gap-2">
                    <span aria-hidden>📞</span>
                    {pressing.telephone ?? '—'}
                  </p>
                </div>

                {/* Stats du jour */}
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-card bg-green-50 p-2.5">
                    <p className="text-xs text-green-700">CA aujourd’hui</p>
                    <p className="text-sm font-bold text-green-800">
                      {chargementResumes ? '…' : formatFCFA(ca_jour)}
                    </p>
                  </div>
                  <div className="rounded-card bg-orange-50 p-2.5">
                    <p className="text-xs text-orange-700">Créances</p>
                    <p className="text-sm font-bold text-orange-800">
                      {chargementResumes ? '…' : formatFCFA(creances)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {depots_jour} dépôt{depots_jour > 1 ? 's' : ''} aujourd’hui
                  </p>
                  <span className="text-sm font-semibold text-pressci-primary">
                    Voir les détails →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
