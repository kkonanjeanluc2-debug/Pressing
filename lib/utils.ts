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

/** Message SMS type "linge prêt" */
export function messageSmsPret(nomClient: string, nomPressing: string, numeroTicket: string): string {
  return `Bonjour ${nomClient}, votre linge est prêt au ${nomPressing}. Ticket ${numeroTicket}. À bientôt !`
}

/** Message SMS de relance créance */
export function messageSmsRelance(nomClient: string, nomPressing: string, montant: number): string {
  return `Bonjour ${nomClient}, il vous reste ${formatFCFA(montant)} à régler au ${nomPressing}. Merci de passer quand vous pouvez. À bientôt !`
}
