export type StatutTicket = 'nouveau' | 'en_traitement' | 'pret' | 'recupere' | 'annule'
export type Plan = 'gratuit' | 'pro' | 'business' | 'reseau'
export type ModePaiement =
  | 'cash'
  | 'wave'
  | 'orange_money'
  | 'mtn_money'
  | 'moov_money'
  | 'a_recuperer'
export type StatutAbonnement = 'actif' | 'expire' | 'suspendu'

export interface Pressing {
  id: string
  owner_id: string
  nom: string
  telephone: string | null
  adresse: string | null
  commune: string | null
  logo_url: string | null
  ticket_counter: number
  ouvert: boolean
  ouvert_depuis: string | null
  ferme_a: string | null
  ouvert_par: string | null
  created_at: string
}

export interface Client {
  id: string
  pressing_id: string
  nom: string
  telephone: string
  email: string | null
  solde_creance: number
  nombre_depots: number
  created_at: string
}

export interface Ticket {
  id: string
  pressing_id: string
  client_id: string
  numero: string
  statut: StatutTicket
  montant_total: number
  montant_paye: number
  mode_paiement: ModePaiement | null
  date_depot: string
  date_prevue: string
  date_recuperation: string | null
  notes: string | null
  sms_envoye: boolean
  sms_envoye_at: string | null
  created_at: string
  client?: Client
  articles?: ArticleTicket[]
}

export interface ArticleTicket {
  id: string
  ticket_id: string
  type_article: string
  quantite: number
  prix_unitaire: number
  sous_total: number
}

export interface Tarif {
  id: string
  /** Catalogue commun : appartient au propriétaire, partagé entre ses pressings */
  owner_id: string
  pressing_id: string | null
  type_article: string
  prix_defaut: number
  actif: boolean
}

export interface Abonnement {
  id: string
  /** L'abonnement est pris par le propriétaire/entreprise */
  owner_id: string
  pressing_id: string | null
  plan: Plan
  statut: StatutAbonnement
  date_debut: string
  date_fin: string | null
  /** Référence de paiement GeniusPay */
  transaction_id: string | null
  montant: number | null
  created_at: string
}

export type TypeCompte = 'personne' | 'entreprise'

/** Profil du propriétaire (affiché sur les documents). */
export interface ProfilProprietaire {
  user_id: string
  type_compte: TypeCompte
  /** Nom complet (personne) ou raison sociale (entreprise) */
  nom: string
  rccm: string | null
  ncc: string | null
  telephone: string | null
  logo_url: string | null
  created_at: string
}

export type ModePaiementDepense =
  | 'cash'
  | 'wave'
  | 'orange_money'
  | 'mtn_money'
  | 'moov_money'
  | 'banque'

export interface Depense {
  id: string
  pressing_id: string
  date_depense: string
  libelle: string
  /** Code du compte de charge SYSCOHADA (classe 6) */
  compte: string
  montant: number
  mode_paiement: ModePaiementDepense
  reference: string | null
  created_at: string
}

export interface Encaissement {
  id: string
  pressing_id: string
  ticket_id: string
  montant: number
  mode_paiement: ModePaiement
  created_at: string
  ticket?: Ticket
}

export interface PermissionsAgent {
  creer_tickets: boolean
  changer_statut: boolean
  encaisser: boolean
  envoyer_sms: boolean
  gerer_clients: boolean
  gerer_vetements: boolean
  voir_caisse: boolean
  voir_stats: boolean
  gerer_depenses: boolean
}

export interface Agent {
  id: string
  pressing_id: string
  user_id: string
  nom: string
  telephone: string
  actif: boolean
  permissions: PermissionsAgent
  created_at: string
}

export const PERMISSIONS_DEFAUT: PermissionsAgent = {
  creer_tickets: true,
  changer_statut: true,
  encaisser: true,
  envoyer_sms: true,
  gerer_clients: true,
  gerer_vetements: false,
  voir_caisse: false,
  voir_stats: false,
  gerer_depenses: false,
}

export const PERMISSIONS_LABELS: Record<keyof PermissionsAgent, string> = {
  creer_tickets: 'Créer des dépôts',
  changer_statut: 'Changer le statut des tickets',
  encaisser: 'Encaisser les paiements',
  envoyer_sms: 'Notifier les clients (WhatsApp/SMS)',
  gerer_clients: 'Gérer les clients',
  gerer_vetements: 'Ajouter/modifier les vêtements',
  voir_caisse: 'Voir la caisse du jour',
  voir_stats: 'Voir les rapports',
  gerer_depenses: 'Saisir les dépenses (comptabilité)',
}

export interface DashboardStats {
  tickets_actifs: number
  tickets_prets: number
  ca_jour: number
  ca_semaine: number
  ca_mois: number
  creances_total: number
  clients_total: number
}

export interface SemaineCA {
  semaine: string
  montant: number
}

export interface ArticleFormItem {
  type_article: string
  quantite: number
  prix_unitaire: number
}

export interface NouveauTicketInput {
  client_id: string | null
  client_nom: string
  client_telephone: string
  articles: ArticleFormItem[]
  date_prevue: string
  mode_paiement: ModePaiement
  montant_paye: number
  notes: string
}

export interface PlanInfo {
  id: Plan
  nom: string
  prix: number
  description: string
  limite_tickets: number | null
  /** Nombre maximum de pressings (null = illimité) */
  limite_pressings: number | null
}

export const PLANS: PlanInfo[] = [
  {
    id: 'gratuit',
    nom: 'Gratuit',
    prix: 0,
    description: '1 pressing · 20 tickets par mois',
    limite_tickets: 20,
    limite_pressings: 1,
  },
  {
    id: 'pro',
    nom: 'Pro',
    prix: 5000,
    description: '1 pressing · tickets et SMS illimités',
    limite_tickets: null,
    limite_pressings: 1,
  },
  {
    id: 'business',
    nom: 'Business',
    prix: 8000,
    description: '3 pressings · tickets et SMS illimités',
    limite_tickets: null,
    limite_pressings: 3,
  },
  {
    id: 'reseau',
    nom: 'Réseau',
    prix: 12000,
    description: 'Pressings illimités · tout illimité',
    limite_tickets: null,
    limite_pressings: null,
  },
]

// ---------- Console super admin ----------

export interface StatsAdmin {
  comptes: { total: number; entreprises: number; personnes: number }
  pressings: { total: number; ouverts: number }
  agents: { total: number; actifs: number }
  tickets: { total: number; mois: number }
  volume_mois: number
  abonnements: {
    gratuit: number
    pro: number
    business: number
    reseau: number
    mrr: number
    revenus_total: number
  }
  derniers_comptes: Array<{
    nom: string
    type_compte: string
    created_at: string
    plan: string
  }>
}

export interface UtilisateurAdmin {
  user_id: string
  nom: string
  type_compte: string
  email: string
  telephone: string | null
  created_at: string
  nb_pressings: number
  plan: string
  actif: boolean
}

export interface AbonnementAdmin {
  id: string
  plan: string
  statut: string
  montant: number | null
  date_debut: string | null
  date_fin: string | null
  created_at: string
  proprietaire: string
}

export interface ActiviteAdmin {
  tickets: Array<{
    numero: string
    statut: string
    montant_total: number
    created_at: string
    pressing: string
  }>
  encaissements: Array<{
    montant: number
    mode_paiement: string
    created_at: string
    pressing: string
  }>
}

export const COMMUNES_ABIDJAN: string[] = [
  'Abobo',
  'Adjamé',
  'Attécoubé',
  'Cocody',
  'Koumassi',
  'Marcory',
  'Plateau',
  'Port-Bouët',
  'Treichville',
  'Yopougon',
  'Bingerville',
  'Songon',
  'Anyama',
  'Autre',
]
