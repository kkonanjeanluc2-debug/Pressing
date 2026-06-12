'use client'

import { ecrireCache, estFrais, lireCache, marquerFraicheur } from '@/lib/cache'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fenêtre de fraîcheur : si les données ont été chargées il y a moins de
 * 15 secondes, on ne refait pas la requête à la navigation (le cache suffit).
 */
const TTL_FRAICHEUR_MS = 15_000

/** Requêtes en cours, partagées entre tous les composants (déduplication). */
const requetesEnVol = new Map<string, Promise<unknown>>()

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
 * 2. si les données sont fraîches (< 15 s), aucune requête réseau n'est faite ;
 * 3. sinon, rafraîchissement silencieux en arrière-plan ;
 * 4. les requêtes identiques simultanées sont dédupliquées.
 *
 * `recharger()` force toujours un vrai rechargement réseau (après mutation).
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
      // Déduplication : une seule requête réseau par clé à la fois
      let promesse = requetesEnVol.get(cle) as Promise<T> | undefined
      if (!promesse) {
        promesse = chargerRef.current().then((resultat) => {
          ecrireCache(cle, resultat)
          marquerFraicheur(cle)
          return resultat
        })
        requetesEnVol.set(cle, promesse as Promise<unknown>)
        void promesse.finally(() => requetesEnVol.delete(cle))
      }
      const resultat = await promesse
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
    // 1. Affichage instantané depuis le cache
    const enCache = lireCache<T>(cle)
    if (enCache !== null) {
      setDonnees(enCache)
      setChargement(false)
      // 2. Données récentes : pas besoin de retoucher au réseau
      if (estFrais(cle, TTL_FRAICHEUR_MS)) return
    } else {
      setDonnees(null)
      setChargement(true)
    }
    // 3. Rafraîchissement silencieux
    void recharger()
  }, [cle, recharger])

  return { donnees, chargement, erreur, recharger }
}
