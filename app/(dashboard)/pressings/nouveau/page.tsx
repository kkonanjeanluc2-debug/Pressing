'use client'

import CreerPressing from '@/components/onboarding/CreerPressing'
import { useProfil } from '@/hooks/useProfil'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NouveauPressingPage() {
  const router = useRouter()
  const { role, chargement } = useProfil()

  if (chargement) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (role !== 'proprietaire') {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🔒</p>
        <p className="font-semibold">Réservé au propriétaire du compte.</p>
        <Link href="/pressings" className="mt-2 inline-block font-semibold text-pressci-primary">
          Retour aux pressings
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 pt-5">
      <header className="mb-2 flex items-center gap-3">
        <Link
          href="/pressings"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-pressci-dark">Nouveau pressing</h1>
      </header>

      <CreerPressing
        titre="Ajouter un pressing"
        sousTitre="Un nouveau point de vente pour votre réseau"
        surCreation={() => {
          router.push('/pressings')
          router.refresh()
        }}
      />
    </div>
  )
}
