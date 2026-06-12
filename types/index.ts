export type StatutTicket = 'nouveau' | 'en_traitement' | 'pret' | 'recupere' | 'annule'
export type Plan = 'gratuit' | 'pro' | 'reseau'
export type ModePaiement = 'cash' | 'wave' | 'orange_money' | 'a_recuperer'
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
  pressing_id: string
  type_article: string
  prix_defaut: number
  actif: boolean
}

export interface Abonnement {
  id: string
  pressing_id: string
  plan: Plan
  statut: StatutAbonnement
  date_debut: string
  date_fin: string | null
  cinetpay_transaction_id: string | null
  montant: number | null
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
}

export const PLANS: PlanInfo[] = [
  {
    id: 'gratuit',
    nom: 'Gratuit',
    prix: 0,
    description: '20 tickets par mois',
    limite_tickets: 20,
  },
  {
    id: 'pro',
    nom: 'Pro',
    prix: 5000,
    description: 'Tickets illimités, SMS clients',
    limite_tickets: null,
  },
  {
    id: 'reseau',
    nom: 'Réseau',
    prix: 12000,
    description: 'Multi-points de vente, illimité',
    limite_tickets: null,
  },
]

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
