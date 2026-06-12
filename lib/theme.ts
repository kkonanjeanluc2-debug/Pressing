/**
 * Thème de l'application : clair, sombre ou selon le système.
 * Mémorisé dans le navigateur, appliqué via la classe `dark` sur <html>.
 */

export type Theme = 'clair' | 'sombre' | 'systeme'

const CLE_THEME = 'pressci_theme'

export function lireTheme(): Theme {
  if (typeof window === 'undefined') return 'clair'
  const t = window.localStorage.getItem(CLE_THEME)
  return t === 'sombre' || t === 'systeme' ? t : 'clair'
}

export function appliquerTheme(theme: Theme): void {
  window.localStorage.setItem(CLE_THEME, theme)
  const sombre =
    theme === 'sombre' ||
    (theme === 'systeme' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', sombre)
}

/** Script inline exécuté avant le rendu pour éviter le flash clair/sombre. */
export const SCRIPT_THEME = `try{var t=localStorage.getItem('${CLE_THEME}');var d=t==='sombre'||(t==='systeme'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}`
