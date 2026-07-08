import type { ModePaiement, StatutTicket } from '@/types'

/** Concatène des classes CSS conditionnelles. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Formate un montant en FCFA : 11500 → "11 500 FCFA" */
export function formatFCFA(montant: number): string {
  return `${montant.toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`
}

/** Formate une date en français : "12 juin 2026" */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Formate une date courte : "12 juin" */
export function formatDateCourte(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

/** Formate date + heure : "12 juin 2026 à 14:30" */
export function formatDateHeure(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${formatDate(d)} à ${heure}`
}

/** Heure courte : "08h12" */
export function formatHeure(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
}

/** Date au format input HTML (yyyy-MM-dd) */
export function toInputDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const j = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${j}`
}

/** Date prévue par défaut : aujourd'hui + 2 jours */
export function datePrevueDefaut(): string {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return toInputDate(d)
}

/** La date prévue est-elle dépassée (pour un ticket non récupéré) ? */
export function estEnRetard(datePrevue: string, statut: StatutTicket): boolean {
  if (statut === 'recupere' || statut === 'annule') return false
  return new Date(datePrevue).getTime() < new Date().setHours(0, 0, 0, 0)
}

export const STATUT_LABELS: Record<StatutTicket, string> = {
  nouveau: 'Nouveau',
  en_traitement: 'En traitement',
  pret: 'Prêt',
  recupere: 'Récupéré',
  annule: 'Annulé',
}

export const STATUT_COULEURS: Record<StatutTicket, string> = {
  nouveau: 'bg-violet-100 text-violet-700',
  en_traitement: 'bg-orange-100 text-orange-700',
  pret: 'bg-green-100 text-green-700',
  recupere: 'bg-gray-100 text-gray-600',
  annule: 'bg-red-100 text-red-700',
}

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  cash: 'Cash',
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_money: 'MTN MoMo',
  moov_money: 'Moov Money',
  a_recuperer: 'À récupérer',
}

/** Normalise un numéro ivoirien : retire espaces, tirets, préfixe +225 */
export function normaliserTelephone(tel: string): string {
  let t = tel.replace(/[\s\-.]/g, '')
  if (t.startsWith('+225')) t = t.slice(4)
  if (t.startsWith('225') && t.length > 10) t = t.slice(3)
  return t
}

/** Valide un numéro ivoirien (10 chiffres, commence par 0) */
export function validerTelephone(tel: string): boolean {
  const t = normaliserTelephone(tel)
  return /^0\d{9}$/.test(t)
}

/** Numéro au format international Orange SMS : "0707070707" → "+2250707070707" */
export function telephoneInternational(tel: string): string {
  return `+225${normaliserTelephone(tel)}`
}

/**
 * Les agents se connectent avec leur téléphone : on dérive un email
 * synthétique pour Supabase Auth ("0707070707" → "0707070707@agents.pressci.app").
 */
export function emailAgent(tel: string): string {
  return `${normaliserTelephone(tel)}@agents.pressci.app`
}

/** Petite icône par type de vêtement ou service (catalogue, listes). */
export function emojiArticle(nom: string): string {
  const n = nom.toLowerCase()
  if (n.includes('forfait') || n.includes('formule') || n.includes('pack')) return '🎁'
  if (n.includes('smoking') || n.includes('costume de thé') || n.includes('déguisement')) return '🎩'
  if (n.includes('maillot de bain')) return '🩱'
  if (n.includes('peignoir')) return '🛁'
  if (n.includes('tapis de bain')) return '🪣'
  if (n.includes('robe de mariée') || n.includes('voile de mariée')) return '👰'
  if (n.includes('uniforme scolaire')) return '🎒'
  if (n.includes('tenue militaire')) return '🪖'
  if (n.includes('blouse de médecin') || n.includes('blouse de labor')) return '🩺'
  if (n.includes('tenue de cuisinier') || n.includes('tablier')) return '👨‍🍳'
  if (n.includes('salopette') || n.includes('uniforme') || n.includes('tenue de travail') || n.includes('veste de travail') || n.includes('tenue de commis') || n.includes('tenue de sécurité') || n.includes('uniforme de sécurité') || n.includes('blouse de labor')) return '🦺'
  if (n.includes('chemise') || n.includes('chemisier')) return '👔'
  if (n.includes('t-shirt') || n.includes('polo') || n.includes('top') || n.includes('body')) return '👕'
  if (n.includes('pull') || n.includes('gilet') || n.includes('cachemire')) return '🧶'
  if (n.includes('pantalon') || n.includes('jean') || n.includes('short') || n.includes('combinaison')) return '👖'
  if (n.includes('smoking') || n.includes('costume') || n.includes('tailleur')) return '🤵'
  if (n.includes('robe') || n.includes('jupe')) return '👗'
  if (n.includes('boubou') || n.includes('kaftan') || n.includes('djellaba') || n.includes('saharienne') || n.includes('agbada') || n.includes('grand complet')) return '🧕'
  if (n.includes('bazin') || n.includes('brodé') || n.includes('kita') || n.includes('fani') || n.includes('wax') || n.includes('soie') || n.includes('cérémonie') || n.includes('célébration') || n.includes('notabilité') || n.includes('chef') || n.includes('danse tradition') || n.includes('kabba') || n.includes('attié') || n.includes('pagne') || n.includes('africain') || n.includes('broderie') || n.includes('baptême') || n.includes('communion') || n.includes('tabaski') || n.includes('noël') || n.includes('pâques')) return '👘'
  if (n.includes('veste en cuir') || n.includes('similicuir') || n.includes('manteau en laine')) return '🥼'
  if (n.includes('veste') || n.includes('manteau') || n.includes('blouson') || n.includes('veste femme')) return '🧥'
  if (n.includes('cravate') || n.includes('nœud papillon') || n.includes('écharpe') || n.includes('echarpe')) return '🧣'
  if (n.includes('drap') || n.includes('couette') || n.includes('housse de couette') || n.includes('tour de lit') || n.includes('couverture') || n.includes('taie') || n.includes('oreiller') || n.includes('tour de lit')) return '🛏️'
  if (n.includes('nappe') || n.includes('serviette de table') || n.includes('jeté')) return '🍽️'
  if (n.includes('rideau')) return '🪟'
  if (n.includes('serviette de bain') || n.includes('tapis de bain')) return '🏊'
  if (n.includes('chaussure')) return '👞'
  if (n.includes('sac en tissu') || n.includes('sac / sacoche') || n.includes('sacoche')) return '👜'
  if (n.includes('sous-vêt') || n.includes('dentelle') || n.includes('maillot')) return '🩲'
  return '🧺'
}

/** Palette de couleurs pour les vêtements. */
export const COULEURS_VETEMENT: Array<{ nom: string; hex: string; contour?: boolean }> = [
  { nom: 'Blanc', hex: '#FFFFFF', contour: true },
  { nom: 'Noir', hex: '#1C1C1E' },
  { nom: 'Gris', hex: '#8E8E93' },
  { nom: 'Beige', hex: '#D4B896' },
  { nom: 'Marron', hex: '#8B5A2B' },
  { nom: 'Rouge', hex: '#FF3B30' },
  { nom: 'Bordeaux', hex: '#800020' },
  { nom: 'Rose', hex: '#FF69B4' },
  { nom: 'Orange', hex: '#FF9500' },
  { nom: 'Jaune', hex: '#FFCC00' },
  { nom: 'Vert', hex: '#34C759' },
  { nom: 'Bleu', hex: '#007AFF' },
  { nom: 'Marine', hex: '#003366' },
  { nom: 'Violet', hex: '#AF52DE' },
]

/** Nom français de la couleur depuis son code hex. */
export function nomCouleur(hex: string): string {
  return COULEURS_VETEMENT.find((c) => c.hex === hex)?.nom ?? hex
}

/**
 * Nombre réel de vêtements pour une ligne d'article.
 * Pour "Forfait 20 vetements" × 2 → 40. Pour tout autre article → quantite.
 */
export function nbVetementsArticle(typeArticle: string | undefined, quantite: number): number {
  if (!typeArticle) return quantite
  const n = typeArticle.toLowerCase()
  const isForfait = n.includes('forfait') || n.includes('formule') || n.includes('pack')
  if (!isForfait) return quantite
  const m = typeArticle.match(/(\d+)/)
  return m ? quantite * parseInt(m[1] ?? '0', 10) : quantite
}

/** Message SMS type "linge prêt" */
export function messageSmsPret(nomClient: string, nomPressing: string, numeroTicket: string): string {
  return `Bonjour ${nomClient}, votre linge est prêt au ${nomPressing}. Ticket ${numeroTicket}. À bientôt !`
}

/** Message SMS de relance créance */
export function messageSmsRelance(nomClient: string, nomPressing: string, montant: number): string {
  return `Bonjour ${nomClient}, il vous reste ${formatFCFA(montant)} à régler au ${nomPressing}. Merci de passer quand vous pouvez. À bientôt !`
}
