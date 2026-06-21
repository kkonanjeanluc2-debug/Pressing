'use client'

import { createClient } from '@/lib/supabase/client'
import {
  EVT_FILE,
  obtenirFileHorsLigne,
  supprimerTicketHorsLigne,
  type TicketHorsLigne,
} from '@/lib/ticketHorsLigne'
import { useCallback, useEffect, useRef, useState } from 'react'

export type StatutSync = 'inactif' | 'en_cours' | 'succes' | 'erreur_partielle'

export function useSyncHorsLigne() {
  const [nbEnAttente, setNbEnAttente] = useState(0)
  const [statut, setStatut] = useState<StatutSync>('inactif')
  const enCoursRef = useRef(false)

  function rafraichirCompteur() {
    setNbEnAttente(obtenirFileHorsLigne().length)
  }

  const synchroniser = useCallback(async () => {
    if (enCoursRef.current) return
    const file = obtenirFileHorsLigne()
    if (file.length === 0) return

    enCoursRef.current = true
    setStatut('en_cours')

    const supabase = createClient()
    let erreurs = 0

    for (const t of file) {
      try {
        await syncUnTicket(supabase, t)
        supprimerTicketHorsLigne(t.id)
      } catch {
        erreurs++
      }
    }

    enCoursRef.current = false
    rafraichirCompteur()
    setStatut(erreurs === 0 ? 'succes' : 'erreur_partielle')
    setTimeout(() => setStatut('inactif'), 5000)
  }, [])

  useEffect(() => {
    rafraichirCompteur()

    const handleOnline = () => void synchroniser()
    const handleFile = () => rafraichirCompteur()

    window.addEventListener('online', handleOnline)
    window.addEventListener(EVT_FILE, handleFile)

    if (navigator.onLine && obtenirFileHorsLigne().length > 0) {
      void synchroniser()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener(EVT_FILE, handleFile)
    }
  }, [synchroniser])

  return { nbEnAttente, statut, synchroniser }
}

async function syncUnTicket(supabase: ReturnType<typeof createClient>, t: TicketHorsLigne) {
  // --- Client ---
  let clientId: string
  if (t.client.existant) {
    clientId = t.client.id
  } else {
    // Chercher par téléphone pour éviter les doublons
    const { data: existant } = await supabase
      .from('clients')
      .select('id')
      .eq('pressing_id', t.pressingId)
      .eq('telephone', t.client.telephone)
      .maybeSingle()

    if (existant) {
      clientId = existant.id as string
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert({ pressing_id: t.pressingId, nom: t.client.nom, telephone: t.client.telephone })
        .select('id')
        .single()
      if (error || !data) throw error ?? new Error('client null')
      clientId = data.id as string
    }
  }

  // --- Numéro séquentiel ---
  const { data: numero, error: erreurNumero } = await supabase.rpc('next_ticket_numero', {
    p_pressing_id: t.pressingId,
  })
  if (erreurNumero || typeof numero !== 'string') throw erreurNumero ?? new Error('numero null')

  // --- Ticket ---
  const { data: ticket, error: erreurTicket } = await supabase
    .from('tickets')
    .insert({
      pressing_id: t.pressingId,
      client_id: clientId,
      numero,
      statut: 'nouveau',
      montant_total: t.montantTotal,
      montant_paye: t.montantPaye,
      mode_paiement: t.modePaiement,
      date_prevue: new Date(`${t.datePrevue}T18:00:00`).toISOString(),
      notes: t.notes,
    })
    .select('id')
    .single()
  if (erreurTicket || !ticket) throw erreurTicket ?? new Error('ticket null')

  // --- Articles ---
  const { error: erreurArticles } = await supabase.from('articles_ticket').insert(
    t.articles.map((a) => ({
      ticket_id: ticket.id as string,
      type_article: a.type_article,
      quantite: a.quantite,
      prix_unitaire: a.prix_unitaire,
      sous_total: a.quantite * a.prix_unitaire,
      couleur: a.couleur ?? null,
    }))
  )
  if (erreurArticles) throw erreurArticles

  // --- Encaissement ---
  if (t.montantPaye > 0 && t.modePaiement !== 'a_recuperer') {
    await supabase.from('encaissements').insert({
      pressing_id: t.pressingId,
      ticket_id: ticket.id as string,
      montant: t.montantPaye,
      mode_paiement: t.modePaiement,
    })
  }
}
