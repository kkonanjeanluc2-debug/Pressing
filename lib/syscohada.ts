/**
 * Plan comptable SYSCOHADA révisé (extraits adaptés à un pressing).
 * Référentiel comptable OHADA en vigueur en Côte d'Ivoire.
 */

export interface CompteSyscohada {
  code: string
  intitule: string
}

/** Comptes de charges (classe 6) proposés à la saisie des dépenses. */
export const COMPTES_CHARGES: CompteSyscohada[] = [
  { code: '604', intitule: 'Achats de matières et fournitures (produits lessiviels…)' },
  { code: '6051', intitule: 'Eau' },
  { code: '6052', intitule: 'Électricité' },
  { code: '6053', intitule: 'Carburant et autres énergies' },
  { code: '6056', intitule: 'Petit matériel et outillage' },
  { code: '618', intitule: 'Transports et déplacements' },
  { code: '622', intitule: 'Loyer et charges locatives' },
  { code: '624', intitule: 'Entretien et réparations' },
  { code: '625', intitule: "Primes d'assurance" },
  { code: '627', intitule: 'Publicité et communication' },
  { code: '628', intitule: 'Frais de télécommunications (téléphone, internet)' },
  { code: '632', intitule: 'Honoraires (comptable, conseils…)' },
  { code: '641', intitule: 'Impôts et taxes' },
  { code: '661', intitule: 'Salaires et rémunérations du personnel' },
  { code: '664', intitule: 'Charges sociales (CNPS…)' },
  { code: '671', intitule: 'Intérêts des emprunts' },
  { code: '658', intitule: 'Autres charges diverses' },
]

/** Compte de produits : prestations du pressing. */
export const COMPTE_PRODUITS: CompteSyscohada = {
  code: '706',
  intitule: 'Services vendus (prestations pressing)',
}

/** Compte clients (créances sur tickets non soldés). */
export const COMPTE_CLIENTS: CompteSyscohada = {
  code: '411',
  intitule: 'Clients',
}

/** Comptes de trésorerie selon le mode de paiement. */
export const COMPTES_TRESORERIE: Record<string, CompteSyscohada> = {
  cash: { code: '571', intitule: 'Caisse' },
  wave: { code: '551', intitule: 'Monnaie électronique — Wave' },
  orange_money: { code: '552', intitule: 'Monnaie électronique — Orange Money' },
  banque: { code: '521', intitule: 'Banque' },
}

export function compteTresorerie(modePaiement: string): CompteSyscohada {
  return COMPTES_TRESORERIE[modePaiement] ?? COMPTES_TRESORERIE.cash as CompteSyscohada
}

export function intituleCompteCharge(code: string): string {
  return COMPTES_CHARGES.find((c) => c.code === code)?.intitule ?? `Compte ${code}`
}

/** Modes de règlement des dépenses. */
export const MODES_DEPENSE = [
  { id: 'cash', label: 'Caisse (espèces)' },
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'banque', label: 'Banque' },
] as const

export type ModeDepense = (typeof MODES_DEPENSE)[number]['id']
