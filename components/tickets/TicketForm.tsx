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
import type { ArticleFormItem, Client, ModePaiement, Tarif } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'

interface TicketFormProps {
  pressingId: string
}

const MODES: ModePaiement[] = ['cash', 'wave', 'orange_money', 'a_recuperer']

export default function TicketForm({ pressingId }: TicketFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // Client
  const [rechercheTel, setRechercheTel] = useState('')
  const [suggestions, setSuggestions] = useState<Client[]>([])
  const [clientChoisi, setClientChoisi] = useState<Client | null>(null)
  const [nouveauNom, setNouveauNom] = useState('')
  const [creerNouveau, setCreerNouveau] = useState(false)
  const rechercheTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Articles
  const [tarifs, setTarifs] = useState<Tarif[]>([])
  const [articles, setArticles] = useState<ArticleFormItem[]>([
    { type_article: '', quantite: 1, prix_unitaire: 0 },
  ])

  // Paiement et dates
  const [datePrevue, setDatePrevue] = useState(datePrevueDefaut())
  const [modePaiement, setModePaiement] = useState<ModePaiement>('cash')
  const [montantPaye, setMontantPaye] = useState('')
  const [notes, setNotes] = useState('')

  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)
  const [limiteAtteinte, setLimiteAtteinte] = useState(false)

  const montantTotal = articles.reduce((s, a) => s + a.quantite * a.prix_unitaire, 0)

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

  function majArticle(index: number, maj: Partial<ArticleFormItem>) {
    setArticles((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a
        const nouveau = { ...a, ...maj }
        // Si le type change, pré-remplir le prix depuis les tarifs
        if (maj.type_article !== undefined) {
          const tarif = tarifs.find((t) => t.type_article === maj.type_article)
          if (tarif) nouveau.prix_unitaire = tarif.prix_defaut
        }
        return nouveau
      })
    )
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
      setErreur('Ajoutez au moins un article.')
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

  return (
    <>
      <form onSubmit={soumettre} className="space-y-4">
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

        {/* ---- Articles ---- */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Articles</h2>
          <div className="space-y-3">
            {articles.map((article, i) => (
              <div key={i} className="rounded-card border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Article {i + 1}</span>
                  {articles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setArticles((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs font-medium text-red-600"
                    >
                      Retirer
                    </button>
                  )}
                </div>

                <select
                  value={article.type_article}
                  onChange={(e) => majArticle(i, { type_article: e.target.value })}
                  className="mb-2 w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary"
                  aria-label={`Type d'article ${i + 1}`}
                >
                  <option value="">Choisir l’article…</option>
                  {tarifs.map((t) => (
                    <option key={t.id} value={t.type_article}>
                      {t.type_article} — {formatFCFA(t.prix_defaut)}
                    </option>
                  ))}
                  <option value="Autre">Autre</option>
                </select>

                {article.type_article === 'Autre' && (
                  <input
                    type="text"
                    placeholder="Nom de l'article"
                    onChange={(e) => majArticle(i, { type_article: e.target.value || 'Autre' })}
                    className="mb-2 w-full rounded-card border border-gray-300 px-3 py-3 outline-none focus:border-pressci-primary"
                  />
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Qté</label>
                    <input
                      type="number"
                      min={1}
                      value={article.quantite}
                      onChange={(e) =>
                        majArticle(i, { quantite: Math.max(1, parseInt(e.target.value, 10) || 1) })
                      }
                      className="w-full rounded-card border border-gray-300 px-2 py-2.5 text-center outline-none focus:border-pressci-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Prix unitaire</label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={article.prix_unitaire || ''}
                      onChange={(e) =>
                        majArticle(i, { prix_unitaire: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full rounded-card border border-gray-300 px-2 py-2.5 text-center outline-none focus:border-pressci-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Sous-total</label>
                    <div className="rounded-card bg-gray-50 px-2 py-2.5 text-center text-sm font-semibold">
                      {(article.quantite * article.prix_unitaire).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setArticles((prev) => [...prev, { type_article: '', quantite: 1, prix_unitaire: 0 }])
              }
              className="w-full rounded-card border border-dashed border-pressci-primary py-2.5 text-sm font-semibold text-pressci-primary"
            >
              + Ajouter article
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-pressci-dark">{formatFCFA(montantTotal)}</span>
          </div>
        </Card>

        {/* ---- Dates et paiement ---- */}
        <Card className="space-y-4">
          <Input
            label="Date prévue de retrait"
            type="date"
            name="date_prevue"
            value={datePrevue}
            onChange={(e) => setDatePrevue(e.target.value)}
            required
          />

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Mode de paiement</span>
            <div className="grid grid-cols-2 gap-2">
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

          {modePaiement !== 'a_recuperer' && (
            <Input
              label="Montant payé à la dépose (FCFA)"
              type="number"
              name="montant_paye"
              min={0}
              step={50}
              placeholder="0 si paiement au retrait"
              value={montantPaye}
              onChange={(e) => setMontantPaye(e.target.value)}
            />
          )}

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

        <Button type="submit" pleineLargeur chargement={chargement}>
          Enregistrer le dépôt — {formatFCFA(montantTotal)}
        </Button>
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
