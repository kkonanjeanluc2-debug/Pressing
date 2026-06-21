'use client'

import { useSyncHorsLigne } from '@/hooks/useSyncHorsLigne'
import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [horsLigne, setHorsLigne] = useState(false)
  const { nbEnAttente, statut, synchroniser } = useSyncHorsLigne()

  useEffect(() => {
    // Délai court avant de vérifier navigator.onLine pour éviter les faux
    // négatifs au montage (courant sur PWA Android / iOS Safari).
    const timer = setTimeout(() => setHorsLigne(!navigator.onLine), 1500)
    const surLigne = () => setHorsLigne(false)
    const horsLigneFn = () => setHorsLigne(true)
    window.addEventListener('online', surLigne)
    window.addEventListener('offline', horsLigneFn)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('online', surLigne)
      window.removeEventListener('offline', horsLigneFn)
    }
  }, [])

  if (statut === 'succes') {
    return (
      <div className="sticky top-0 z-50 bg-green-600 px-4 py-2 text-center text-sm font-medium text-white">
        ✅ Tickets synchronisés avec succès
      </div>
    )
  }

  if (statut === 'en_cours') {
    return (
      <div className="sticky top-0 z-50 bg-pressci-primary px-4 py-2 text-center text-sm font-medium text-white">
        ⏳ Synchronisation en cours…
      </div>
    )
  }

  if (statut === 'erreur_partielle') {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between bg-red-500 px-4 py-2">
        <p className="text-sm font-medium text-white">
          ⚠️ Certains tickets n&apos;ont pas pu être synchronisés
        </p>
        <button
          type="button"
          onClick={() => void synchroniser()}
          className="ml-4 shrink-0 text-sm font-semibold text-white underline"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (horsLigne) {
    return (
      <div className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
        📵 Hors ligne — les tickets créés seront synchronisés à la reconnexion
        {nbEnAttente > 0 && ` · ${nbEnAttente} en attente`}
      </div>
    )
  }

  if (nbEnAttente > 0) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-50 px-4 py-2.5">
        <p className="text-sm font-medium text-amber-800">
          🔄 {nbEnAttente} ticket{nbEnAttente > 1 ? 's' : ''} en attente de synchronisation
        </p>
        <button
          type="button"
          onClick={() => void synchroniser()}
          className="ml-4 shrink-0 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
        >
          Synchroniser
        </button>
      </div>
    )
  }

  return null
}
