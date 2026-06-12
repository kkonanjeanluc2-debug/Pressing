'use client'

import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [horsLigne, setHorsLigne] = useState(false)

  useEffect(() => {
    setHorsLigne(!navigator.onLine)
    const surLigne = () => setHorsLigne(false)
    const horsLigneFn = () => setHorsLigne(true)
    window.addEventListener('online', surLigne)
    window.addEventListener('offline', horsLigneFn)
    return () => {
      window.removeEventListener('online', surLigne)
      window.removeEventListener('offline', horsLigneFn)
    }
  }, [])

  if (!horsLigne) return null

  return (
    <div className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
      Vous êtes hors ligne — vos données seront synchronisées au retour du réseau
    </div>
  )
}
