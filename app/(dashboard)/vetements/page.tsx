'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import { createClient } from '@/lib/supabase/client'
import { emojiArticle, formatFCFA } from '@/lib/utils'
import type { Tarif } from '@/types'
import { useEffect, useRef, useState, type FormEvent } from 'react'

interface LigneImport {
  nom: string
  prix: number
}

/** Parse une liste collée ou un CSV : « Nom;Prix » (séparateur ; , ou tabulation). */
function parserListe(texte: string): { valides: LigneImport[]; ignorees: number } {
  const valides: LigneImport[] = []
  let ignorees = 0
  for (const brute of texte.split(/\r?\n/)) {
    const ligne = brute.trim()
    if (!ligne) continue
    const morceaux = ligne.split(/[;,\t]/).map((m) => m.trim())
    const nom = morceaux[0] ?? ''
    const prix = parseInt((morceaux[1] ?? '').replace(/[^\d]/g, ''), 10)
    // Ignorer une éventuelle ligne d'en-tête ("nom;prix")
    if (nom.toLowerCase() === 'nom' || nom.toLowerCase() === 'article') continue
    if (nom.length >= 2 && !Number.isNaN(prix) && prix >= 0) {
      valides.push({ nom, prix })
    } else {
      ignorees++
    }
  }
  return { valides, ignorees }
}

export default function VetementsPage() {
  const { pressings, chargement: chargementPressings } = usePressing()
  const { role } = useProfil()
  const supabase = createClient()

  // Catalogue COMMUN à tous les pressings : il appartient au propriétaire
  const ownerId = pressings[0]?.owner_id ?? null

  // Ajout simple
  const [nom, setNom] = useState('')
  const [prix, setPrix] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enregistrement, setEnregistrement] = useState(false)

  // Import
  const [importOuvert, setImportOuvert] = useState(false)
  const [texteImport, setTexteImport] = useState('')
  const [importEnCours, setImportEnCours] = useState(false)
  const fichierRef = useRef<HTMLInputElement | null>(null)

  const { donnees: vetements, chargement, recharger } = useDonneesCachees<Tarif[]>(
    ownerId ? `vetements_${ownerId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('tarifs')
        .select('*')
        .eq('owner_id', ownerId as string)
        .order('type_article')
      if (error) throw error
      return (data ?? []) as Tarif[]
    },
    'Impossible de charger les vêtements. Vérifiez votre réseau.'
  )

  const liste = vetements ?? []
  const proprietaire = role === 'proprietaire'

  useEffect(() => {
    setMessage(null)
    setErreur(null)
  }, [ownerId])

  async function ajouter(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setMessage(null)
    const prixNum = parseInt(prix, 10)
    if (nom.trim().length < 2) {
      setErreur('Entrez le nom du vêtement.')
      return
    }
    if (Number.isNaN(prixNum) || prixNum < 0) {
      setErreur('Entrez un prix valide.')
      return
    }
    if (liste.some((v) => v.type_article.toLowerCase() === nom.trim().toLowerCase())) {
      setErreur('Ce vêtement existe déjà dans la liste.')
      return
    }
    if (!ownerId) return

    setEnregistrement(true)
    const { error } = await supabase.from('tarifs').insert({
      owner_id: ownerId,
      type_article: nom.trim(),
      prix_defaut: prixNum,
    })
    if (error) {
      setErreur("L'ajout a échoué. Réessayez.")
    } else {
      setNom('')
      setPrix('')
      await recharger()
    }
    setEnregistrement(false)
  }

  async function modifierPrix(v: Tarif, prixTexte: string) {
    const prixNum = parseInt(prixTexte, 10)
    if (Number.isNaN(prixNum) || prixNum < 0 || prixNum === v.prix_defaut) return
    await supabase.from('tarifs').update({ prix_defaut: prixNum }).eq('id', v.id)
    await recharger()
  }

  async function basculerActif(v: Tarif) {
    await supabase.from('tarifs').update({ actif: !v.actif }).eq('id', v.id)
    await recharger()
  }

  async function supprimer(v: Tarif) {
    if (!window.confirm(`Supprimer « ${v.type_article} » de la liste ?`)) return
    await supabase.from('tarifs').delete().eq('id', v.id)
    await recharger()
  }

  function lireFichier(fichier: File) {
    const lecteur = new FileReader()
    lecteur.onload = () => {
      setTexteImport(String(lecteur.result ?? ''))
    }
    lecteur.readAsText(fichier, 'utf-8')
  }

  async function importer() {
    setErreur(null)
    setMessage(null)
    if (!ownerId) return

    const { valides, ignorees } = parserListe(texteImport)
    if (valides.length === 0) {
      setErreur(
        'Aucune ligne valide. Format attendu : un vêtement par ligne, « Nom;Prix » (ex : Chemise;500).'
      )
      return
    }

    // Ne pas dupliquer les vêtements déjà présents
    const existants = new Set(liste.map((v) => v.type_article.toLowerCase()))
    const nouveaux = valides.filter((l) => !existants.has(l.nom.toLowerCase()))
    const doublons = valides.length - nouveaux.length

    if (nouveaux.length === 0) {
      setErreur('Tous les vêtements de la liste existent déjà.')
      return
    }

    setImportEnCours(true)
    const { error } = await supabase.from('tarifs').insert(
      nouveaux.map((l) => ({
        owner_id: ownerId,
        type_article: l.nom,
        prix_defaut: l.prix,
      }))
    )
    setImportEnCours(false)

    if (error) {
      setErreur("L'import a échoué. Vérifiez votre réseau et réessayez.")
      return
    }

    setImportOuvert(false)
    setTexteImport('')
    setMessage(
      `✅ ${nouveaux.length} vêtement${nouveaux.length > 1 ? 's' : ''} importé${nouveaux.length > 1 ? 's' : ''}` +
        (doublons > 0 ? ` · ${doublons} déjà existant${doublons > 1 ? 's' : ''} ignoré${doublons > 1 ? 's' : ''}` : '') +
        (ignorees > 0 ? ` · ${ignorees} ligne${ignorees > 1 ? 's' : ''} invalide${ignorees > 1 ? 's' : ''}` : '')
    )
    await recharger()
  }

  const apercu = parserListe(texteImport)

  if (chargementPressings) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 pt-5">
      {/* En-tête */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-pressci-dark lg:text-2xl">Vêtements</h1>
          <p className="text-sm text-gray-500">
            {liste.length} vêtement{liste.length > 1 ? 's' : ''} — catalogue commun à{' '}
            {pressings.length > 1 ? `vos ${pressings.length} pressings` : 'votre pressing'}
          </p>
        </div>
        {proprietaire && (
          <button
            type="button"
            onClick={() => setImportOuvert((o) => !o)}
            className="shrink-0 rounded-card bg-pressci-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pressci-secondary"
          >
            ⬆ Importer une liste
          </button>
        )}
      </header>

      {message && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* ---- Import de liste ---- */}
      {importOuvert && proprietaire && (
        <Card className="space-y-3 border-pressci-accent">
          <h2 className="text-sm font-semibold text-gray-700">Importer une liste de vêtements</h2>
          <p className="text-xs text-gray-500">
            Un vêtement par ligne au format <strong>Nom;Prix</strong> (séparateur ; , ou
            tabulation). Exemple : <code>Chemise;500</code>. Vous pouvez coller la liste ou
            charger un fichier CSV/TXT (Excel : « Enregistrer sous → CSV »).
          </p>

          <textarea
            rows={6}
            placeholder={'Chemise;500\nPantalon;700\nCostume 2 pièces;2500'}
            value={texteImport}
            onChange={(e) => setTexteImport(e.target.value)}
            className="w-full rounded-card border border-gray-300 px-3 py-3 font-mono text-sm outline-none focus:border-pressci-primary"
          />

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fichierRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) lireFichier(f)
              }}
            />
            <Button
              variante="outline"
              className="min-h-[40px] py-2 text-sm"
              onClick={() => fichierRef.current?.click()}
            >
              📂 Choisir un fichier CSV
            </Button>
            {texteImport.trim() && (
              <span className="text-xs text-gray-500">
                {apercu.valides.length} ligne{apercu.valides.length > 1 ? 's' : ''} valide
                {apercu.valides.length > 1 ? 's' : ''}
                {apercu.ignorees > 0 ? ` · ${apercu.ignorees} invalide${apercu.ignorees > 1 ? 's' : ''}` : ''}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              chargement={importEnCours}
              disabled={apercu.valides.length === 0}
              onClick={() => void importer()}
            >
              Importer {apercu.valides.length > 0 ? `(${apercu.valides.length})` : ''}
            </Button>
            <Button variante="ghost" className="flex-1" onClick={() => setImportOuvert(false)}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Ajout d'un vêtement ---- */}
      {proprietaire && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Ajouter un vêtement</h2>
          <form onSubmit={(e) => void ajouter(e)} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <Input
                label="Nom"
                placeholder="Ex : Gandoura"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Input
                label="Prix (FCFA)"
                type="number"
                min={0}
                placeholder="1500"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
              />
            </div>
            <Button type="submit" chargement={enregistrement} className="shrink-0">
              + Ajouter
            </Button>
          </form>
        </Card>
      )}

      {/* ---- Liste ---- */}
      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : liste.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          <p className="mb-2 text-4xl">👕</p>
          <p>Aucun vêtement au catalogue pour ce pressing.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {liste.map((v) => (
            <div
              key={v.id}
              className={`flex items-center gap-3 rounded-card border bg-white p-3 ${
                v.actif ? 'border-gray-200' : 'border-gray-200 opacity-50'
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {emojiArticle(v.type_article)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800">{v.type_article}</p>
                <p className="text-xs text-gray-500">
                  {v.actif ? formatFCFA(v.prix_defaut) : 'Désactivé (masqué au dépôt)'}
                </p>
              </div>
              {proprietaire ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    defaultValue={v.prix_defaut}
                    onBlur={(e) => void modifierPrix(v, e.target.value)}
                    aria-label={`Prix de ${v.type_article}`}
                    className="w-24 rounded-card border border-gray-300 px-2 py-1.5 text-right text-sm outline-none focus:border-pressci-primary"
                  />
                  <button
                    type="button"
                    onClick={() => void basculerActif(v)}
                    title={v.actif ? 'Désactiver' : 'Réactiver'}
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      v.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {v.actif ? 'Actif' : 'Inactif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void supprimer(v)}
                    aria-label={`Supprimer ${v.type_article}`}
                    className="px-1 text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="shrink-0 text-sm font-semibold text-pressci-primary">
                  {formatFCFA(v.prix_defaut)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
