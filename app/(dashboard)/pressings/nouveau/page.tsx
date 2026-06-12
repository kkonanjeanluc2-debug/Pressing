'use client'

import CreerPressing from '@/components/onboarding/CreerPressing'
import { changerPressingActif } from '@/hooks/usePressing'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NouveauPressingPage() {
  const router = useRouter()

  return (
    <div className="px-4 pt-5">
      <header className="mb-2 flex items-center gap-3">
        <Link
          href="/parametres"
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
        surCreation={(pressingId) => {
          changerPressingActif(pressingId)
          router.push('/')
          router.refresh()
        }}
      />
    </div>
  )
}
