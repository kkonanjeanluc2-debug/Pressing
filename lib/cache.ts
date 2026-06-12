/**
 * Cache local des données : mémoire (instantané) + localStorage (survit au
 * rechargement de la page). Permet d'afficher les données immédiatement à la
 * navigation, pendant qu'elles se rafraîchissent en arrière-plan.
 */

const PREFIXE = 'pressci_cache_'

const memoire = new Map<string, unknown>()

export function lireCache<T>(cle: string): T | null {
  if (memoire.has(cle)) return memoire.get(cle) as T
  if (typeof window === 'undefined') return null
  try {
    const brut = window.localStorage.getItem(PREFIXE + cle)
    if (!brut) return null
    const valeur = JSON.parse(brut) as T
    memoire.set(cle, valeur)
    return valeur
  } catch {
    return null
  }
}

export function ecrireCache<T>(cle: string, valeur: T): void {
  memoire.set(cle, valeur)
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur))
  } catch {
    // localStorage plein ou indisponible : le cache mémoire suffit
  }
}

/** Vide tout le cache (à appeler à la déconnexion). */
export function viderCache(): void {
  memoire.clear()
  if (typeof window === 'undefined') return
  try {
    const aSupprimer: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const cle = window.localStorage.key(i)
      if (cle && cle.startsWith(PREFIXE)) aSupprimer.push(cle)
    }
    aSupprimer.forEach((c) => window.localStorage.removeItem(c))
  } catch {
    // ignorer
  }
}
