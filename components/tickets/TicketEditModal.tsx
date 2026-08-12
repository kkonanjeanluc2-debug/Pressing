'use client'

import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import {
  COULEURS_VETEMENT,
  emojiArticle,
  formatFCFA,
  labelPrestation,
  MODE_PAIEMENT_LABELS,
  nomCouleur,
  PRESTATIONS,
  toInputDate,
} from '@/lib/utils'
import type { ArticleFormItem, ModePaiement, Pressing, Tarif, Ticket } from '@/types'
import { useEffect, useState } from 'react'

const MODES: ModePaiement[] = ['cash', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'a_recuperer']

interface TicketEditModalProps {
  ticket: Ticket
  pressing: Pressing
  onClose: () => void
  onSuccess: () => Promise<void>
}

export default function TicketEditModal({ ticket, pressing, onClose, onSuccess }: TicketEditModalProps) {
  const supabase = createClient()

  const [articles, setArticles] = useState<ArticleFormItem[]>(() =>
    (ticket.articles ?? []).map((a) => ({
      type_article: a.type_article,
      quantite: a.quantite,
      prix_unitaire: a.prix_unitaire,
      couleur: a.couleur ?? undefined,
      prestation: a.prestation ?? undefined,
    }))
  )
  const [datePrevue, setDatePrevue] = useState(() => toInputDate(new Date(ticket.date_prevue)))
  const [modePaiement, setModePaiement] = useState<ModePaiement>(ticket.mode_paiement ?? 'cash')
  const [montantPaye, setMontantPaye] = useState(String(ticket.montant_paye))
  const [notes, setNotes] = useState(ticket.notes ?? '')

  const [tarifs, setTarifs] = useState<Tarif[]>([])
  const [rechercheArticle, setRechercheArticle] = useState('')
  const [ouvertCouleur, setOuvertCouleur] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  // Réduction
  const [reductionActive, setReductionActive] = useState(() => (ticket.reduction ?? 0) > 0)
  const [reductionType, setReductionType] = useState<'pct' | 'montant'>('montant')
  const [reductionValeur, setReductionValeur] = useState(() => String(ticket.reduction ?? 0) === '0' ? '' : String(ticket.reduction ?? 0))

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

  useEffect(() => {
    async function chargerTarifs() {
      const { data } = await supabase
        .from('tarifs')
        .select('*')
        .eq('owner_id', pressing.owner_id)
        .eq('actif', true)
        .order('type_article')
      setTarifs((data ?? []) as Tarif[])
    }
    void chargerTarifs()
  }, [pressing.owner_id, supabase])

  function ajouterDepuisCatalogue(tarif: Tarif) {
    setOuvertCouleur(null)
    setArticles((prev) => {
      const i = prev.findIndex(
        (a) => a.type_article === tarif.type_article && a.prix_unitaire === tarif.prix_defaut && !a.couleur
      )
      if (i >= 0) return prev.map((a, j) => (j === i ? { ...a, quantite: a.quantite + 1 } : a))
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
      prev.map((a, i) => (i === index ? { ...a, quantite: Math.max(1, a.quantite + delta) } : a))
    )
  }

  function retirerLigne(index: number) {
    setArticles((prev) => prev.filter((_, i) => i !== index))
  }

  async function sauvegarder() {
    const articlesValides = articles.filter((a) => a.type_article.trim() !== '')
    if (articlesValides.length === 0) {
      setErreur('Ajoutez au moins un article.')
      return
    }
    const paye = montantPaye === '' ? 0 : parseInt(montantPaye, 10)
    if (Number.isNaN(paye) || paye < 0) {
      setErreur('Le montant payé est invalide.')
      return
    }
    if (paye > montantTotal) {
      setErreur('Le montant payé ne peut pas dépasser le total.')
      return
    }

    setChargement(true)
    setErreur(null)

    const montantPayeAjuste = paye

    const { error: errTicket } = await supabase
      .from('tickets')
      .update({
        montant_total: montantTotal,
        montant_paye: montantPayeAjuste,
        ...(reductionMontant > 0 ? { reduction: reductionMontant } : {}),
        date_prevue: new Date(`${datePrevue}T18:00:00`).toISOString(),
        mode_paiement: modePaiement,
        notes: notes.trim() || null,
      })
      .eq('id', ticket.id)

    if (errTicket) {
      setErreur('La mise à jour a échoué. Réessayez.')
      setChargement(false)
      return
    }

    await supabase.from('articles_ticket').delete().eq('ticket_id', ticket.id)
    await supabase.from('articles_ticket').insert(
      articlesValides.map((a) => ({
        ticket_id: ticket.id,
        type_article: a.type_article.trim(),
        quantite: a.quantite,
        prix_unitaire: a.prix_unitaire,
        sous_total: a.quantite * a.prix_unitaire,
        couleur: a.couleur ?? null,
        ...(a.prestation ? { prestation: a.prestation } : {}),
      }))
    )

    await onSuccess()
    onClose()
    setChargement(false)
  }

  const tarifsFiltres = rechercheArticle.trim()
    ? tarifs.filter((t) => t.type_article.toLowerCase().includes(rechercheArticle.toLowerCase()))
    : tarifs
  const tarifsFiltresVetements = tarifsFiltres.filter((t) => t.categorie !== 'forfait')
  const tarifsFiltresForfaits = tarifsFiltres.filter((t) => t.categorie === 'forfait')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-[94vh] w-full flex-col rounded-t-2xl bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl">

        {/* En-tête */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Modifier le ticket</h2>
            <p className="text-sm text-gray-500">{ticket.numero} · {ticket.client?.nom}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">

          {/* Catalogue */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Catalogue — touchez pour ajouter</p>
            <input
              type="search"
              placeholder="Rechercher un article…"
              value={rechercheArticle}
              onChange={(e) => setRechercheArticle(e.target.value)}
              className="mb-3 w-full rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
            />
            <div className="grid max-h-[30vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
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
              <button
                type="button"
                onClick={ajouterArticleLibre}
                className="flex flex-col items-center justify-center gap-1 rounded-card border border-dashed border-pressci-primary bg-white p-2.5 text-center"
              >
                <span className="text-2xl text-pressci-primary" aria-hidden>＋</span>
                <span className="text-xs font-medium text-pressci-primary">Article libre</span>
              </button>
            </div>

            {tarifsFiltresForfaits.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-gray-500">🎁 Forfaits & services</p>
                <div className="grid grid-cols-2 gap-2">
                  {tarifsFiltresForfaits.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => ajouterDepuisCatalogue(t)}
                      className="flex items-center gap-2 rounded-card border border-dashed border-green-300 bg-green-50 px-3 py-2 text-left"
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
          </div>

          {/* Panier */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Panier</p>
              <span className="text-xs text-gray-500">{nbPieces} pièce{nbPieces > 1 ? 's' : ''}</span>
            </div>

            {ouvertCouleur !== null && (
              <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOuvertCouleur(null)} />
            )}

            {articles.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                Panier vide — touchez un article du catalogue pour l'ajouter.
              </p>
            ) : (
              <div className="space-y-2">
                {articles.map((article, i) => (
                  <div key={i} className="rounded-card border border-gray-200 p-2.5">
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

                    {/* Prestation */}
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

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={article.prix_unitaire || ''}
                          placeholder="Prix"
                          onChange={(e) => majLigne(i, { prix_unitaire: parseInt(e.target.value, 10) || 0 })}
                          className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-pressci-primary"
                          aria-label={`Prix de ${article.type_article || "l'article"}`}
                        />
                        <span className="text-xs text-gray-400">F</span>
                      </div>

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

                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changerQuantite(i, -1)}
                          aria-label="Diminuer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-lg font-bold text-red-500 active:bg-red-100"
                        >−</button>
                        <span className="w-7 text-center text-sm font-bold">{article.quantite}</span>
                        <button
                          type="button"
                          onClick={() => changerQuantite(i, 1)}
                          aria-label="Augmenter"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-lg font-bold text-green-600 active:bg-green-100"
                        >+</button>
                      </div>

                      <span className="w-16 shrink-0 text-right text-sm font-semibold text-gray-800">
                        {(article.quantite * article.prix_unitaire).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sélecteur de couleur */}
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
                    onClick={() => { majLigne(ouvertCouleur, { couleur: undefined }); setOuvertCouleur(null) }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100 text-sm text-gray-500 active:bg-gray-200"
                    title="Aucune couleur"
                  >✕</button>
                  {COULEURS_VETEMENT.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => { majLigne(ouvertCouleur, { couleur: c.hex }); setOuvertCouleur(null) }}
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
          </div>

          {/* Réduction */}
          {articles.length > 0 && (
            <div className="border-t border-dashed border-gray-200 pt-3">
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

          {/* Date prévue + Montant payé */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date prévue de retrait
              </label>
              <input
                type="date"
                value={datePrevue}
                onChange={(e) => setDatePrevue(e.target.value)}
                className="w-full rounded-card border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-pressci-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Montant payé à la dépose (FCFA)
              </label>
              <input
                type="number"
                min={0}
                value={montantPaye}
                onChange={(e) => setMontantPaye(e.target.value)}
                placeholder="0"
                className="w-full rounded-card border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-pressci-primary"
              />
            </div>
          </div>

          {/* Mode de paiement */}
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">Mode de paiement</p>
            <div className="grid grid-cols-3 gap-2">
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

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes (facultatif)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : tache sur la manche droite"
              className="w-full rounded-card border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-pressci-primary"
            />
          </div>

          {erreur && (
            <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
          )}
        </div>

        {/* Pied fixe */}
        <div className="shrink-0 border-t border-gray-200 p-4 space-y-2">
          <div className="flex items-center justify-between rounded-card bg-pressci-dark p-3 text-white">
            <div>
              <p className="text-xs opacity-70">
                {nbPieces} pièce{nbPieces > 1 ? 's' : ''} · Nouveau total
              </p>
              {reductionMontant > 0 && (
                <p className="text-xs line-through opacity-40">{formatFCFA(montantBrut)}</p>
              )}
              <p className="text-xl font-bold text-pressci-accent">{formatFCFA(montantTotal)}</p>
            </div>
            <Button chargement={chargement} onClick={() => void sauvegarder()} className="shrink-0">
              ✓ Enregistrer
            </Button>
          </div>
          <Button variante="ghost" pleineLargeur onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  )
}
