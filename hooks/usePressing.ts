'use client'

import { createClient } from '@/lib/supabase/client'
import type { Pressing } from '@/types'
import { useCallback, useEffect, useState } from 'react'

const CLE_PRESSING_ACTIF = 'pressci_pressing_actif'
const EVENEMENT_CHANGEMENT = 'pressci:pressing-change'

interface UsePressingResult {
  /** Pressing actuellement sélectionné */
  pressing: Pressing | null
  /** Tous les pressings du propriétaire */
  pressings: Pressing[]
  chargement: boolean
  erreur: string | null
  /** Bascule sur un autre pressing (persisté, synchronisé entre composants) */
  changerPressing: (id: string) => void
  recharger: () => void
}

function lirePressingActif(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CLE_PRESSING_ACTIF)
}

/** Bascule le pressing actif et notifie tous les composants qui utilisent le hook. */
export function changerPressingActif(id: string): void {
  window.localStorage.setItem(CLE_PRESSING_ACTIF, id)
  window.dispatchEvent(new CustomEvent(EVENEMENT_CHANGEMENT, { detail: id }))
}

/**
 * Charge les pressings du gérant connecté.
 * Un propriétaire peut avoir plusieurs pressings : le pressing « actif »
 * est mémorisé dans le navigateur et partagé entre tous les composants.
 */
export function usePressing(): UsePressingResult {
  const [pressings, setPressings] = useState<Pressing[]>([])
  const [actifId, setActifId] = useState<string | null>(lirePressingActif)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let annule = false
    const supabase = createClient()

    async function charger() {
      setChargement(true)
      const { data, error } = await supabase
        .from('pressings')
        .select('*')
        .order('created_at', { ascending: true })

      if (annule) return
      if (error) {
        setErreur('Impossible de charger votre pressing. Vérifiez votre réseau.')
      } else {
        setPressings((data ?? []) as Pressing[])
        setErreur(null)
      }
      setChargement(false)
    }

    void charger()
    return () => {
      annule = true
    }
  }, [version])

  // Synchronisation du pressing actif entre tous les composants
  useEffect(() => {
    function surChangement(e: Event) {
      const detail = (e as CustomEvent<string>).detail
      setActifId(detail)
      setVersion((v) => v + 1)
    }
    window.addEventListener(EVENEMENT_CHANGEMENT, surChangement)
    return () => window.removeEventListener(EVENEMENT_CHANGEMENT, surChangement)
  }, [])

  const changerPressing = useCallback((id: string) => {
    changerPressingActif(id)
  }, [])

  // Pressing actif : celui mémorisé s'il existe encore, sinon le premier
  const pressing =
    pressings.find((p) => p.id === actifId) ?? pressings[0] ?? null

  return {
    pressing,
    pressings,
    chargement,
    erreur,
    changerPressing,
    recharger: () => setVersion((v) => v + 1),
  }
}
