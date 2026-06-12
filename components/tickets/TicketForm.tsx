'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { rechercherClients } from '@/hooks/useClients'
import { createClient } from '@/lib/supabase/client'
import {
  datePrevueDefaut,
  formatFCFA,
  MODE_PAIEMENT_LABELS,
  normaliserTelephone,
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

const MODES: ModePaiement[] = ['cash', 'wave', 'orange_money', 'a_recuperer']

/** Petite icône par type d'article pour les tuiles du catalogue. */
function emojiArticle(nom: string): string {
  const n = nom.toLowerCase()
  if (n.includes('chemise')) return '👔'
  if (n.includes('pantalon') || n.includes('jean')) return '👖'
  if (n.includes('costume')) return '🤵'
  if (n.includes('robe')) return '👗'
  if (n.includes('jupe')) return '👗'
  if (n.includes('boubou')) return '🧕'
  if (n.includes('drap') || n.includes('couette') || n.includes('couverture')) return '🛏️'
  if (n.includes('veste') || n.includes('manteau') || n.includes('blouson')) return '🧥'
  if (n.includes('chaussure')) return '👞'
  return '🧺'
}

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

  const montantTotal = articles.reduce((s, a) => s + a.quantite * a.prix_unitaire, 0)
  const nbPieces = articles.reduce((s, a) => s + a.quantite, 0)

  // Charger les tarifs prédéfinis du pressing
  useEffect(() => {
    async function chargerTarifs() {
      const { data } = await supabase
        .from('tarifs')
        .select('*')
        .eq('pressing_id', pressingId)
        .eq('actif', true)
        .order('type_article')
      setTarifs((data ?? []) as Tarif[])
    }
    void chargerTarifs()
  }, [pressingId, supabase])

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
    setArticles((prev) => {
      const i = prev.findIndex(
        (a) => a.type_article === tarif.type_article && a.prix_unitaire === tarif.prix_defaut
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
      <div className="grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {tarifsFiltres.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => ajouterDepuisCatalogue(t)}
            className="flex flex-col items-center gap-1 rounded-card border border-gray-200 bg-white p-2.5 text-center transition-colors hover:border-pressci-primary active:bg-pressci-light"
          >
            <span className="text-2xl" aria-hidden>
              {emojiArticle(t.type_article)}
            </span>
            <span className="w-full truncate text-xs font-medium text-gray-800">
              {t.type_article}
            </span>
            <span className="text-[11px] font-semibold text-pressci-primary">
              {formatFCFA(t.prix_defaut)}
            </span>
          </button>
        ))}

        {/* Article libre */}
        <button
          type="button"
          onClick={ajouterArticleLibre}
          className="flex flex-col items-center justify-center gap-1 rounded-card border border-dashed border-pressci-primary bg-white p-2.5 text-center transition-colors active:bg-pressci-light"
        >
          <span className="text-2xl text-pressci-primary" aria-hidden>
            ＋
          </span>
          <span className="text-xs font-medium text-pressci-primary">Article libre</span>
        </button>
      </div>
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

              {articles.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Le panier est vide — touchez un article du catalogue pour l’ajouter.
                </p>
              ) : (
                <div className="space-y-2">
                  {articles.map((article, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-card border border-gray-200 p-2.5"
                    >
                      {/* Nom + prix unitaire */}
                      <div className="min-w-0 flex-1">
                        {article.type_article === '' ? (
                          <input
                            type="text"
                            placeholder="Nom de l'article"
                            autoFocus
                            onBlur={(e) => majLigne(i, { type_article: e.target.value })}
                            className="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-pressci-primary"
                          />
                        ) : (
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {emojiArticle(article.type_article)} {article.type_article}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <input
                            type="number"
                            min={0}
                            value={article.prix_unitaire || ''}
                            placeholder="Prix"
                            onChange={(e) =>
                              majLigne(i, { prix_unitaire: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-pressci-primary"
                            aria-label={`Prix unitaire de ${article.type_article || 'l’article'}`}
                          />
                          <span>FCFA / pièce</span>
                        </div>
                      </div>

                      {/* Quantité - / + */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changerQuantite(i, -1)}
                          aria-label="Diminuer la quantité"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-lg font-bold text-red-500 active:bg-red-100"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{article.quantite}</span>
                        <button
                          type="button"
                          onClick={() => changerQuantite(i, 1)}
                          aria-label="Augmenter la quantité"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-lg font-bold text-green-600 active:bg-green-100"
                        >
                          +
                        </button>
                      </div>

                      {/* Sous-total */}
                      <span className="w-20 shrink-0 text-right text-sm font-semibold text-gray-800">
                        {(article.quantite * article.prix_unitaire).toLocaleString('fr-FR')}
                      </span>

                      {/* Retirer */}
                      <button
                        type="button"
                        onClick={() => retirerLigne(i)}
                        aria-label="Retirer l'article"
                        className="shrink-0 px-1 text-lg font-bold text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
