'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { rechercherClients } from '@/hooks/useClients'
import { createClient } from '@/lib/supabase/client'
import { ajouterTicketHorsLigne } from '@/lib/ticketHorsLigne'
import {
  COULEURS_VETEMENT,
  datePrevueDefaut,
  emojiArticle,
  formatFCFA,
  labelPrestation,
  MODE_PAIEMENT_LABELS,
  nomCouleur,
  normaliserTelephone,
  PRESTATIONS,
  validerTelephone,
} from '@/lib/utils'
import type { ArticleFormItem, Client, ModePaiement, Pressing, Tarif } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'

interface TicketFormProps {
  pressings: Pressing[]
  /** Pressing présélectionné (ex : depuis « Travailler dans ce pressing ») */
  pressingInitial?: string | null
}

const MODES: ModePaiement[] = [
  'cash',
  'wave',
  'orange_money',
  'mtn_money',
  'moov_money',
  'a_recuperer',
]

export default function TicketForm({ pressings, pressingInitial }: TicketFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // Pressing dans lequel le dépôt est créé
  const [pressingId, setPressingId] = useState<string>(() =>
    pressingInitial && pressings.some((p) => p.id === pressingInitial)
      ? pressingInitial
      : pressings[0]?.id ?? ''
  )

  // Client
  const [rechercheTel, setRechercheTel] = useState('')
  const [suggestions, setSuggestions] = useState<Client[]>([])
  const [clientChoisi, setClientChoisi] = useState<Client | null>(null)
  const [nouveauNom, setNouveauNom] = useState('')
  const [creerNouveau, setCreerNouveau] = useState(false)
  const rechercheTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Catalogue + panier
  const [tarifs, setTarifs] = useState<Tarif[]>([])
  const [rechercheArticle, setRechercheArticle] = useState('')
  const [articles, setArticles] = useState<ArticleFormItem[]>([])

  // Paiement et dates
  const [datePrevue, setDatePrevue] = useState(datePrevueDefaut())
  const [modePaiement, setModePaiement] = useState<ModePaiement>('cash')
  const [montantPaye, setMontantPaye] = useState('')
  const [notes, setNotes] = useState('')

  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  const [limiteAtteinte, setLimiteAtteinte] = useState(false)
  const [horsLigneEnregistre, setHorsLigneEnregistre] = useState(false)
  const [ouvertCouleur, setOuvertCouleur] = useState<number | null>(null)

  // Réduction
  const [reductionActive, setReductionActive] = useState(false)
  const [reductionType, setReductionType] = useState<'pct' | 'montant'>('pct')
  const [reductionValeur, setReductionValeur] = useState('')

  const montantBrut = articles.reduce((s, a) => s + a.quantite * a.prix_unitaire, 0)
  const reductionMontant = (() => {
    if (!reductionActive || !reductionValeur) return 0
    const v = parseInt(reductionValeur, 10) || 0
    return reductionType === 'pct'
      ? Math.round(montantBrut * Math.min(v, 100) / 100)
      : Math.min(v, montantBrut)
  })()
  const montantTotal = montantBrut - reductionMontant
  const nbPieces = articles.reduce((s, a) => s + a.quantite, 0)

  // Charger le catalogue de vêtements (commun à tous les pressings du propriétaire)
  const ownerId = pressings[0]?.owner_id ?? null
  useEffect(() => {
    if (!ownerId) return
    async function chargerTarifs() {
      const { data } = await supabase
        .from('tarifs')
        .select('*')
        .eq('owner_id', ownerId as string)
        .eq('actif', true)
        .order('type_article')
      setTarifs((data ?? []) as Tarif[])
    }
    void chargerTarifs()
  }, [ownerId, supabase])

  // Autocomplete client (recherche différée 300 ms)
  useEffect(() => {
    if (clientChoisi || creerNouveau) return
    if (rechercheTimer.current) clearTimeout(rechercheTimer.current)
    rechercheTimer.current = setTimeout(() => {
      void rechercherClients(pressingId, rechercheTel).then(setSuggestions)
    }, 300)
    return () => {
      if (rechercheTimer.current) clearTimeout(rechercheTimer.current)
    }
  }, [rechercheTel, pressingId, clientChoisi, creerNouveau])

  function choisirClient(c: Client) {
    setClientChoisi(c)
    setSuggestions([])
    setRechercheTel(c.telephone)
  }

  function reinitialiserClient() {
    setClientChoisi(null)
    setCreerNouveau(false)
    setNouveauNom('')
    setRechercheTel('')
    setSuggestions([])
  }

  // ---- Panier ----
  function ajouterDepuisCatalogue(tarif: Tarif) {
    setOuvertCouleur(null)
    setArticles((prev) => {
      // Incrémente la ligne existante sans couleur ; sinon ajoute une nouvelle ligne
      // (permet plusieurs lignes du même article avec des couleurs différentes)
      const i = prev.findIndex(
        (a) => a.type_article === tarif.type_article && a.prix_unitaire === tarif.prix_defaut && !a.couleur
      )
      if (i >= 0) {
        return prev.map((a, j) => (j === i ? { ...a, quantite: a.quantite + 1 } : a))
      }
      return [...prev, { type_article: tarif.type_article, quantite: 1, prix_unitaire: tarif.prix_defaut }]
    })
  }

  function ajouterArticleLibre() {
    setArticles((prev) => [...prev, { type_article: '', quantite: 1, prix_unitaire: 0 }])
  }

  function majLigne(index: number, maj: Partial<ArticleFormItem>) {
    setArticles((prev) => prev.map((a, i) => (i === index ? { ...a, ...maj } : a)))
  }

  function changerQuantite(index: number, delta: number) {
    setArticles((prev) =>
      prev.map((a, i) =>
        i === index ? { ...a, quantite: Math.max(1, a.quantite + delta) } : a
      )
    )
  }

  function retirerLigne(index: number) {
    setArticles((prev) => prev.filter((_, i) => i !== index))
  }

  function payeValide() {
    const paye = montantPaye === '' ? 0 : parseInt(montantPaye, 10)
    return Number.isNaN(paye) ? 0 : Math.max(0, paye)
  }

  function mettreEnFileHorsLigne() {
    const articlesValides = articles.filter((a) => a.type_article.trim() !== '')
    ajouterTicketHorsLigne({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      pressingId,
      client: clientChoisi
        ? { existant: true, id: clientChoisi.id }
        : { existant: false, nom: nouveauNom.trim(), telephone: normaliserTelephone(rechercheTel) },
      articles: articlesValides.map((a) => ({
        type_article: a.type_article.trim(),
        quantite: a.quantite,
        prix_unitaire: a.prix_unitaire,
        couleur: a.couleur ?? null,
      })),
      montantTotal,
      montantPaye: payeValide(),
      modePaiement,
      datePrevue,
      notes: notes.trim() || null,
    })
    setHorsLigneEnregistre(true)
    setChargement(false)
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreur(null)

    // --- Validation ---
    if (!clientChoisi && !creerNouveau) {
      setErreur('Choisissez un client ou créez-en un nouveau.')
      return
    }
    if (creerNouveau) {
      if (nouveauNom.trim().length < 2) {
        setErreur('Entrez le nom du client.')
        return
      }
      if (!validerTelephone(rechercheTel)) {
        setErreur('Le numéro du client doit avoir 10 chiffres (ex : 07 07 07 07 07).')
        return
      }
    }
    const articlesValides = articles.filter((a) => a.type_article.trim() !== '')
    if (articlesValides.length === 0) {
      setErreur('Ajoutez au moins un article en touchant le catalogue.')
      return
    }
    if (articlesValides.some((a) => a.quantite < 1 || a.prix_unitaire < 0)) {
      setErreur('Vérifiez les quantités et les prix des articles.')
      return
    }
    if (!datePrevue) {
      setErreur('Choisissez la date prévue de retrait.')
      return
    }
    const paye = montantPaye === '' ? 0 : parseInt(montantPaye, 10)
    if (Number.isNaN(paye) || paye < 0) {
      setErreur('Le montant payé est invalide.')
      return
    }
    if (paye > montantTotal) {
      setErreur('Le montant payé dépasse le total du ticket.')
      return
    }

    setChargement(true)

    // Hors ligne → on enfile directement sans appel réseau
    if (!navigator.onLine) {
      mettreEnFileHorsLigne()
      return
    }

    try {
      // --- Vérification du plan (limite 20 tickets/mois en gratuit) ---
      const { data: autorise, error: erreurPlan } = await supabase.rpc('peut_creer_ticket', {
        p_pressing_id: pressingId,
      })
      if (erreurPlan) throw erreurPlan
      if (autorise === false) {
        setLimiteAtteinte(true)
        setChargement(false)
        return
      }

      // --- Client : existant ou créé à la volée ---
      let clientId: string
      if (clientChoisi) {
        clientId = clientChoisi.id
      } else {
        const { data: nouveauClient, error: erreurClient } = await supabase
          .from('clients')
          .insert({
            pressing_id: pressingId,
            nom: nouveauNom.trim(),
            telephone: normaliserTelephone(rechercheTel),
          })
          .select('id')
          .single()
        if (erreurClient || !nouveauClient) throw erreurClient
        clientId = nouveauClient.id as string
      }

      // --- Numéro de ticket séquentiel (#001, #002…) ---
      const { data: numero, error: erreurNumero } = await supabase.rpc('next_ticket_numero', {
        p_pressing_id: pressingId,
      })
      if (erreurNumero || typeof numero !== 'string') throw erreurNumero

      // --- Création du ticket ---
      const { data: ticket, error: erreurTicket } = await supabase
        .from('tickets')
        .insert({
          pressing_id: pressingId,
          client_id: clientId,
          numero,
          statut: 'nouveau',
          montant_total: montantTotal,
          montant_paye: paye,
          reduction: reductionMontant,
          mode_paiement: modePaiement,
          date_prevue: new Date(`${datePrevue}T18:00:00`).toISOString(),
          notes: notes.trim() || null,
        })
        .select('id')
        .single()
      if (erreurTicket || !ticket) throw erreurTicket

      // --- Articles du ticket ---
      const { error: erreurArticles } = await supabase.from('articles_ticket').insert(
        articlesValides.map((a) => ({
          ticket_id: ticket.id as string,
          type_article: a.type_article.trim(),
          quantite: a.quantite,
          prix_unitaire: a.prix_unitaire,
          sous_total: a.quantite * a.prix_unitaire,
          couleur: a.couleur ?? null,
          prestation: a.prestation ?? null,
        }))
      )
      if (erreurArticles) throw erreurArticles

      // --- Encaissement initial (caisse du jour) ---
      if (paye > 0 && modePaiement !== 'a_recuperer') {
        await supabase.from('encaissements').insert({
          pressing_id: pressingId,
          ticket_id: ticket.id as string,
          montant: paye,
          mode_paiement: modePaiement,
        })
      }

      router.push(`/tickets/${ticket.id as string}?nouveau=1`)
    } catch {
      // Erreur réseau → enregistrement hors ligne
      if (!navigator.onLine) {
        mettreEnFileHorsLigne()
        return
      }
      setErreur("L'enregistrement du dépôt a échoué. Vérifiez votre réseau et réessayez.")
      setChargement(false)
    }
  }

  // Tuiles du catalogue filtrées
  const tarifsFiltres = rechercheArticle.trim()
    ? tarifs.filter((t) =>
        t.type_article.toLowerCase().includes(rechercheArticle.trim().toLowerCase())
      )
    : tarifs

  const tarifsFiltresVetements = tarifsFiltres.filter((t) => t.categorie !== 'forfait')
  const tarifsFiltresForfaits = tarifsFiltres.filter((t) => t.categorie === 'forfait')

  // ---- Catalogue (tuiles cliquables, façon caisse) ----
  const catalogue = (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Catalogue — touchez pour ajouter</h2>
      <input
        type="search"
        placeholder="Rechercher un article…"
        value={rechercheArticle}
        onChange={(e) => setRechercheArticle(e.target.value)}
        className="mb-3 w-full rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
      />

      {/* Vêtements */}
      <div className="grid max-h-[45vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {tarifsFiltresVetements.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => ajouterDepuisCatalogue(t)}
            className="flex flex-col items-center gap-1 rounded-card border border-gray-200 bg-white p-2.5 text-center transition-colors hover:border-pressci-primary active:bg-pressci-light"
          >
            <span className="text-2xl" aria-hidden>{emojiArticle(t.type_article)}</span>
            <span className="w-full truncate text-xs font-medium text-gray-800">{t.type_article}</span>
            <span className="text-[11px] font-semibold text-pressci-primary">{formatFCFA(t.prix_defaut)}</span>
          </button>
        ))}

        {/* Article libre */}
        <button
          type="button"
          onClick={ajouterArticleLibre}
          className="flex flex-col items-center justify-center gap-1 rounded-card border border-dashed border-pressci-primary bg-white p-2.5 text-center transition-colors active:bg-pressci-light"
        >
          <span className="text-2xl text-pressci-primary" aria-hidden>＋</span>
          <span className="text-xs font-medium text-pressci-primary">Article libre</span>
        </button>
      </div>

      {/* Forfaits & services */}
      {tarifsFiltresForfaits.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-gray-500">🎁 Forfaits & services</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tarifsFiltresForfaits.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => ajouterDepuisCatalogue(t)}
                className="flex items-center gap-2 rounded-card border border-dashed border-green-300 bg-green-50 px-3 py-2 text-left transition-colors hover:border-green-500 active:bg-green-100"
              >
                <span className="text-xl" aria-hidden>🎁</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-800">{t.type_article}</p>
                  <p className="text-[11px] font-semibold text-green-700">{formatFCFA(t.prix_defaut)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tarifsFiltres.length === 0 && rechercheArticle && (
        <p className="mt-2 text-center text-sm text-gray-500">
          Aucun article trouvé pour « {rechercheArticle} ».
        </p>
      )}
    </Card>
  )

  return (
    <>
      <form onSubmit={soumettre}>
        <div className="space-y-4 lg:grid lg:grid-cols-5 lg:items-start lg:gap-4 lg:space-y-0">
          {/* ====== Colonne gauche : client, panier, paiement ====== */}
          <div className="space-y-4 lg:col-span-3">
            {/* ---- Pressing cible (propriétaire multi-pressings) ---- */}
            {pressings.length > 1 && (
              <Card>
                <label
                  htmlFor="pressing_cible"
                  className="mb-1 block text-sm font-semibold text-gray-700"
                >
                  Pressing
                </label>
                <select
                  id="pressing_cible"
                  value={pressingId}
                  onChange={(e) => {
                    setPressingId(e.target.value)
                    // Catalogue, tarifs et clients diffèrent : on repart à zéro
                    setArticles([])
                    reinitialiserClient()
                  }}
                  className="w-full rounded-card border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-pressci-primary"
                >
                  {pressings.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                      {p.commune ? ` — ${p.commune}` : ''}
                    </option>
                  ))}
                </select>
              </Card>
            )}

            {/* ---- Client ---- */}
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Client</h2>

              {clientChoisi ? (
                <div className="flex items-center justify-between rounded-card bg-pressci-light px-3 py-2">
                  <div>
                    <p className="font-semibold text-pressci-dark">{clientChoisi.nom}</p>
                    <p className="text-sm text-gray-600">{clientChoisi.telephone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={reinitialiserClient}
                    className="text-sm font-medium text-pressci-primary"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Téléphone ou nom du client"
                    type="tel"
                    name="recherche_client"
                    placeholder="07 07 07 07 07"
                    value={rechercheTel}
                    onChange={(e) => setRechercheTel(e.target.value)}
                    autoComplete="off"
                  />

                  {suggestions.length > 0 && !creerNouveau && (
                    <ul className="divide-y divide-gray-100 rounded-card border border-gray-200">
                      {suggestions.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => choisirClient(c)}
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left active:bg-gray-50"
                          >
                            <span className="font-medium">{c.nom}</span>
                            <span className="text-sm text-gray-500">{c.telephone}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {creerNouveau ? (
                    <Input
                      label="Nom du nouveau client"
                      name="nouveau_nom"
                      placeholder="Ex : Aya Koné"
                      value={nouveauNom}
                      onChange={(e) => setNouveauNom(e.target.value)}
                    />
                  ) : (
                    rechercheTel.trim().length >= 2 && (
                      <button
                        type="button"
                        onClick={() => setCreerNouveau(true)}
                        className="text-sm font-semibold text-pressci-primary"
                      >
                        + Nouveau client avec ce numéro
                      </button>
                    )
                  )}
                </div>
              )}
            </Card>

            {/* ---- Catalogue (mobile : entre client et panier) ---- */}
            <div className="lg:hidden">{catalogue}</div>

            {/* ---- Panier ---- */}
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Panier</h2>
                <span className="text-xs text-gray-500">
                  {nbPieces} pièce{nbPieces > 1 ? 's' : ''}
                </span>
              </div>

              {/* Overlay pour fermer le sélecteur de couleur */}
              {ouvertCouleur !== null && (
                <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOuvertCouleur(null)} />
              )}

              {articles.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Le panier est vide — touchez un article du catalogue pour l'ajouter.
                </p>
              ) : (
                <div className="space-y-2">
                  {articles.map((article, i) => (
                    <div key={i} className="rounded-card border border-gray-200 p-2.5">
                      {/* Ligne 1 : nom complet + supprimer */}
                      <div className="mb-2 flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          {article.type_article === '' ? (
                            <input
                              type="text"
                              placeholder="Nom de l'article"
                              autoFocus
                              onBlur={(e) => majLigne(i, { type_article: e.target.value })}
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-pressci-primary"
                            />
                          ) : (
                            <p className="text-sm font-semibold leading-snug text-gray-800">
                              {emojiArticle(article.type_article)} {article.type_article}
                            </p>
                          )}
                          {article.couleur && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-300"
                                style={{ backgroundColor: article.couleur }}
                              />
                              {nomCouleur(article.couleur)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => retirerLigne(i)}
                          aria-label="Retirer l'article"
                          className="shrink-0 px-1 text-xl text-red-400 active:text-red-600"
                        >✕</button>
                      </div>

                      {/* Ligne 2 : prestation */}
                      <div className="mb-2 flex flex-wrap gap-1">
                        {PRESTATIONS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => majLigne(i, { prestation: article.prestation === p.id ? undefined : p.id })}
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                              article.prestation === p.id
                                ? 'border-pressci-primary bg-pressci-light text-pressci-primary'
                                : 'border-gray-200 text-gray-400 hover:border-pressci-primary hover:text-pressci-primary'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Ligne 3 : prix | couleur | − qté + | sous-total */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={article.prix_unitaire || ''}
                            placeholder="Prix"
                            onChange={(e) =>
                              majLigne(i, { prix_unitaire: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-pressci-primary"
                            aria-label={`Prix unitaire de ${article.type_article || "l'article"}`}
                          />
                          <span className="text-xs text-gray-400">FCFA</span>
                        </div>

                        {/* Bouton couleur */}
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => setOuvertCouleur(ouvertCouleur === i ? null : i)}
                            title="Couleur du vêtement"
                            className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm transition-transform active:scale-90"
                            style={{
                              backgroundColor: article.couleur ?? '#F3F4F6',
                              borderColor: article.couleur ?? '#D1D5DB',
                            }}
                          >
                            {!article.couleur && <span>🎨</span>}
                          </button>
                        </div>

                        {/* Quantité - / + */}
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => changerQuantite(i, -1)}
                            aria-label="Diminuer la quantité"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-lg font-bold text-red-500 active:bg-red-100"
                          >−</button>
                          <span className="w-7 text-center text-sm font-bold">{article.quantite}</span>
                          <button
                            type="button"
                            onClick={() => changerQuantite(i, 1)}
                            aria-label="Augmenter la quantité"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-lg font-bold text-green-600 active:bg-green-100"
                          >+</button>
                        </div>

                        {/* Sous-total */}
                        <span className="w-16 shrink-0 text-right text-sm font-semibold text-gray-800">
                          {(article.quantite * article.prix_unitaire).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Réduction */}
              {articles.length > 0 && (
                <div className="mt-3 border-t border-dashed border-gray-200 pt-3">
                  <button
                    type="button"
                    onClick={() => { setReductionActive(!reductionActive); setReductionValeur('') }}
                    className={`text-sm font-semibold ${reductionActive ? 'text-red-600' : 'text-pressci-primary'}`}
                  >
                    {reductionActive ? '✕ Supprimer la réduction' : '+ Appliquer une réduction'}
                  </button>
                  {reductionActive && (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setReductionType('pct'); setReductionValeur('') }}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${reductionType === 'pct' ? 'border-pressci-primary bg-pressci-light text-pressci-primary' : 'border-gray-300 text-gray-600'}`}
                        >% Pourcentage</button>
                        <button
                          type="button"
                          onClick={() => { setReductionType('montant'); setReductionValeur('') }}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${reductionType === 'montant' ? 'border-pressci-primary bg-pressci-light text-pressci-primary' : 'border-gray-300 text-gray-600'}`}
                        >F Montant fixe</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={reductionType === 'pct' ? 100 : montantBrut}
                          value={reductionValeur}
                          onChange={(e) => setReductionValeur(e.target.value)}
                          placeholder={reductionType === 'pct' ? 'Ex : 10' : 'Ex : 500'}
                          className="w-28 rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                        />
                        <span className="text-sm text-gray-500">{reductionType === 'pct' ? '%' : 'FCFA'}</span>
                        {reductionMontant > 0 && (
                          <span className="text-sm font-semibold text-red-600">= −{reductionMontant.toLocaleString('fr-FR')} FCFA</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sélecteur de couleur — panneau fixe en bas sur mobile */}
              {ouvertCouleur !== null && (
                <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-gray-200 bg-white p-5 shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-1/2 sm:w-72 sm:rounded-2xl sm:border sm:-translate-y-1/2 sm:shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-800">Couleur du vêtement</p>
                    <button
                      type="button"
                      onClick={() => setOuvertCouleur(null)}
                      className="rounded-full px-3 py-1 text-sm text-gray-500 active:bg-gray-100"
                    >Fermer</button>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        majLigne(ouvertCouleur, { couleur: undefined })
                        setOuvertCouleur(null)
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100 text-sm text-gray-500 active:bg-gray-200"
                      title="Aucune couleur"
                    >✕</button>
                    {COULEURS_VETEMENT.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          majLigne(ouvertCouleur, { couleur: c.hex })
                          setOuvertCouleur(null)
                        }}
                        title={c.nom}
                        className={`h-12 w-12 rounded-full ${c.contour ? 'border-2 border-gray-300' : 'border border-gray-200'} ${articles[ouvertCouleur]?.couleur === c.hex ? 'ring-[3px] ring-pressci-primary ring-offset-2' : ''} active:scale-90 transition-transform`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                  {articles[ouvertCouleur]?.couleur && (
                    <p className="mt-4 text-center text-sm font-semibold text-pressci-dark">
                      {nomCouleur(articles[ouvertCouleur].couleur!)}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* ---- Dates et paiement ---- */}
            <Card className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Date prévue de retrait"
                  type="date"
                  name="date_prevue"
                  value={datePrevue}
                  onChange={(e) => setDatePrevue(e.target.value)}
                  required
                />
                {modePaiement !== 'a_recuperer' ? (
                  <Input
                    label="Montant payé à la dépose (FCFA)"
                    type="number"
                    name="montant_paye"
                    min={0}
                    placeholder="0 si paiement au retrait"
                    value={montantPaye}
                    onChange={(e) => setMontantPaye(e.target.value)}
                  />
                ) : (
                  <div />
                )}
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Mode de paiement
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setModePaiement(mode)}
                      className={`rounded-card border px-3 py-2.5 text-sm font-medium ${
                        modePaiement === mode
                          ? 'border-pressci-primary bg-pressci-light text-pressci-dark'
                          : 'border-gray-300 bg-white text-gray-600'
                      }`}
                    >
                      {MODE_PAIEMENT_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
                  Notes (facultatif)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  placeholder="Ex : tache sur la manche droite"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-card border border-gray-300 px-3 py-3 outline-none focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent"
                />
              </div>
            </Card>

            {erreur && (
              <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
            )}

            {/* ---- Barre de total + validation (façon caisse) ---- */}
            <div className="sticky bottom-20 z-30 flex items-center justify-between gap-3 rounded-card bg-pressci-dark p-3 text-white shadow-lg lg:bottom-4">
              <div>
                <p className="text-xs opacity-70">
                  {nbPieces} pièce{nbPieces > 1 ? 's' : ''} · Total à payer
                </p>
                {reductionMontant > 0 && (
                  <p className="text-xs line-through opacity-40">{formatFCFA(montantBrut)}</p>
                )}
                <p className="text-xl font-bold text-pressci-accent">{formatFCFA(montantTotal)}</p>
              </div>
              <Button type="submit" chargement={chargement} className="shrink-0">
                ✓ Enregistrer le dépôt
              </Button>
            </div>
          </div>

          {/* ====== Colonne droite : catalogue (desktop) ====== */}
          <div className="hidden lg:sticky lg:top-4 lg:col-span-2 lg:block">{catalogue}</div>
        </div>
      </form>

      {/* ---- Confirmation ticket enregistré hors ligne ---- */}
      {horsLigneEnregistre && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-card bg-white p-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
              📵
            </div>
            <h3 className="mb-1 text-lg font-bold text-gray-800">Ticket enregistré hors ligne</h3>
            <p className="mb-4 text-sm text-gray-500">
              Il sera synchronisé automatiquement dès que vous aurez du réseau.
            </p>
            <div className="space-y-2">
              <Button
                pleineLargeur
                onClick={() => {
                  setHorsLigneEnregistre(false)
                  // Réinitialiser le formulaire
                  setClientChoisi(null)
                  setNouveauNom('')
                  setRechercheTel('')
                  setCreerNouveau(false)
                  setArticles([])
                  setMontantPaye('')
                  setNotes('')
                  setDatePrevue(datePrevueDefaut())
                }}
              >
                Créer un autre ticket
              </Button>
              <Link href="/tickets" className="block">
                <Button variante="ghost" pleineLargeur>
                  Voir les tickets
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ---- Modale limite du plan gratuit ---- */}
      {limiteAtteinte && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-card bg-white p-5">
            <h3 className="mb-2 text-lg font-bold text-pressci-dark">Limite atteinte 😅</h3>
            <p className="mb-4 text-sm text-gray-600">
              Vous avez utilisé vos 20 tickets gratuits ce mois-ci. Passez au plan Pro
              (5 000 FCFA/mois) pour créer des tickets en illimité et notifier vos clients par SMS.
            </p>
            <div className="space-y-2">
              <Link href="/parametres" className="block">
                <Button pleineLargeur>Passer au Pro</Button>
              </Link>
              <Button variante="ghost" pleineLargeur onClick={() => setLimiteAtteinte(false)}>
                Plus tard
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
