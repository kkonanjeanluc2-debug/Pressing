export interface ArticleHorsLigne {
  type_article: string
  quantite: number
  prix_unitaire: number
  couleur?: string | null
}

export interface TicketHorsLigne {
  id: string
  createdAt: number
  pressingId: string
  client:
    | { existant: true; id: string }
    | { existant: false; nom: string; telephone: string }
  articles: ArticleHorsLigne[]
  montantTotal: number
  montantPaye: number
  modePaiement: string
  datePrevue: string
  notes: string | null
}

const CLE = 'pressci_tickets_hors_ligne'
export const EVT_FILE = 'pressci:file-horsLigne'

export function obtenirFileHorsLigne(): TicketHorsLigne[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '[]') as TicketHorsLigne[]
  } catch {
    return []
  }
}

export function ajouterTicketHorsLigne(ticket: TicketHorsLigne): void {
  const file = obtenirFileHorsLigne()
  localStorage.setItem(CLE, JSON.stringify([...file, ticket]))
  window.dispatchEvent(new Event(EVT_FILE))
}

export function supprimerTicketHorsLigne(id: string): void {
  const file = obtenirFileHorsLigne().filter((t) => t.id !== id)
  localStorage.setItem(CLE, JSON.stringify(file))
  window.dispatchEvent(new Event(EVT_FILE))
}
