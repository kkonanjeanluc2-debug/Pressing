'use client'

import { ecrireCache, lireCache } from '@/lib/cache'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ResultatDonneesCachees<T> {
  donnees: T | null
  /** true uniquement quand il n'y a encore rien à afficher (ni cache, ni réseau) */
  chargement: boolean
  erreur: string | null
  recharger: () => Promise<void>
}

/**
 * Charge des données avec affichage instantané :
 * 1. le cache (mémoire/localStorage) est affiché immédiatement s'il existe ;
 * 2. les données fraîches sont chargées en arrière-plan et remplacent le cache.
 *
 * @param cle clé de cache unique (null = ne rien charger pour l'instant)
 * @param chargerDonnees fonction qui récupère les données fraîches
 * @param messageErreur message affiché à l'utilisateur en cas d'échec réseau
 */
export function useDonneesCachees<T>(
  cle: string | null,
  chargerDonnees: () => Promise<T>,
  messageErreur: string
): ResultatDonneesCachees<T> {
  const chargerRef = useRef(chargerDonnees)
  chargerRef.current = chargerDonnees
  const messageRef = useRef(messageErreur)
  messageRef.current = messageErreur

  // Important : l'état initial doit être identique côté serveur et côté
  // client (pas de lecture du cache ici), sinon erreur d'hydratation React.
  // Le cache est appliqué dans l'effet, juste après le montage.
  const [donnees, setDonnees] = useState<T | null>(null)
  const [chargement, setChargement] = useState<boolean>(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    if (!cle) return
    try {
      const resultat = await chargerRef.current()
      ecrireCache(cle, resultat)
      setDonnees(resultat)
      setErreur(null)
    } catch {
      setErreur(messageRef.current)
    } finally {
      setChargement(false)
    }
  }, [cle])

  useEffect(() => {
    if (!cle) return
    // Affichage instantané depuis le cache, puis rafraîchissement silencieux
    const enCache = lireCache<T>(cle)
    if (enCache !== null) {
      setDonnees(enCache)
      setChargement(false)
    } else {
      setDonnees(null)
      setChargement(true)
    }
    void recharger()
  }, [cle, recharger])

  return { donnees, chargement, erreur, recharger }
}
