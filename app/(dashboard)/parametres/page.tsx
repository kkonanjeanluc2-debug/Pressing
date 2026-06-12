'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { usePressing } from '@/hooks/usePressing'
import { viderCache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import { formatFCFA } from '@/lib/utils'
import { COMMUNES_ABIDJAN, PLANS, type Abonnement, type Plan, type Tarif } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ParametresPage() {
  const router = useRouter()
  const {
    pressing,
    pressings,
    chargement: chargementPressing,
    changerPressing,
    recharger,
  } = usePressing()
  const supabase = createClient()

  // Infos pressing
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [commune, setCommune] = useState('')
  const [sauvegarde, setSauvegarde] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  // Tarifs
  const [tarifs, setTarifs] = useState<Tarif[]>([])
  const [nouveauType, setNouveauType] = useState('')
  const [nouveauPrix, setNouveauPrix] = useState('')

  // Abonnement
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null)
  const [paiementEnCours, setPaiementEnCours] = useState<Plan | null>(null)

  useEffect(() => {
    if (!pressing) return
    setNom(pressing.nom)
    setTelephone(pressing.telephone ?? '')
    setAdresse(pressing.adresse ?? '')
    setCommune(pressing.commune ?? '')

    async function chargerDonnees() {
      if (!pressing) return
      const [tarifsRes, aboRes] = await Promise.all([
        supabase
          .from('tarifs')
          .select('*')
          .eq('pressing_id', pressing.id)
          .order('type_article'),
        supabase
          .from('abonnements')
          .select('*')
          .eq('pressing_id', pressing.id)
          .eq('statut', 'actif')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      setTarifs((tarifsRes.data ?? []) as Tarif[])
      setAbonnement(aboRes.data as Abonnement | null)
    }
    void chargerDonnees()
  }, [pressing, supabase])

  async function sauvegarderInfos() {
    if (!pressing) return
    setSauvegarde(true)
    setMessage(null)
    setErreur(null)

    const { error } = await supabase
      .from('pressings')
      .update({
        nom: nom.trim(),
        telephone: telephone.trim() || null,
        adresse: adresse.trim() || null,
        commune,
      })
      .eq('id', pressing.id)

    if (error) {
      setErreur('La sauvegarde a échoué. Réessayez.')
    } else {
      setMessage('Informations enregistrées ✅')
      recharger()
    }
    setSauvegarde(false)
  }

  async function ajouterTarif() {
    if (!pressing) return
    const prix = parseInt(nouveauPrix, 10)
    if (nouveauType.trim().length < 2 || Number.isNaN(prix) || prix < 0) {
      setErreur('Entrez un nom d’article et un prix valides.')
      return
    }
    setErreur(null)
    const { data, error } = await supabase
      .from('tarifs')
      .insert({ pressing_id: pressing.id, type_article: nouveauType.trim(), prix_defaut: prix })
      .select('*')
      .single()

    if (error || !data) {
      setErreur("L'ajout du tarif a échoué. Réessayez.")
      return
    }
    setTarifs((prev) =>
      [...prev, data as Tarif].sort((a, b) => a.type_article.localeCompare(b.type_article))
    )
    setNouveauType('')
    setNouveauPrix('')
  }

  async function modifierPrixTarif(tarif: Tarif, prixTexte: string) {
    const prix = parseInt(prixTexte, 10)
    if (Number.isNaN(prix) || prix < 0) return
    setTarifs((prev) => prev.map((t) => (t.id === tarif.id ? { ...t, prix_defaut: prix } : t)))
    await supabase.from('tarifs').update({ prix_defaut: prix }).eq('id', tarif.id)
  }

  async function supprimerTarif(tarif: Tarif) {
    if (!window.confirm(`Supprimer le tarif « ${tarif.type_article} » ?`)) return
    const { error } = await supabase.from('tarifs').delete().eq('id', tarif.id)
    if (!error) setTarifs((prev) => prev.filter((t) => t.id !== tarif.id))
  }

  async function passerAuPlan(plan: Plan) {
    if (plan === 'gratuit' || !pressing) return
    setPaiementEnCours(plan)
    setErreur(null)
    try {
      const res = await fetch('/api/abonnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, pressing_id: pressing.id }),
      })
      const data = (await res.json()) as { succes: boolean; url?: string; erreur?: string }
      if (data.succes && data.url) {
        window.location.href = data.url
        return
      }
      setErreur(data.erreur ?? 'Le paiement n’a pas pu être lancé. Réessayez.')
    } catch {
      setErreur('Le paiement n’a pas pu être lancé. Vérifiez votre réseau.')
    }
    setPaiementEnCours(null)
  }

  async function seDeconnecter() {
    await supabase.auth.signOut()
    viderCache()
    router.push('/login')
    router.refresh()
  }

  if (chargementPressing || !pressing) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  const planActuel = abonnement?.plan ?? 'gratuit'

  return (
    <div className="space-y-4 px-4 pt-5">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-pressci-dark">Paramètres</h1>
      </header>

      {message && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* ---- Mes pressings ---- */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Mes pressings ({pressings.length})
          </h2>
          <Link
            href="/pressings/nouveau"
            className="rounded-full bg-pressci-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            + Ajouter
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {pressings.map((p) => {
            const actif = p.id === pressing.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => changerPressing(p.id)}
                className={`flex items-center justify-between rounded-card border p-3 text-left ${
                  actif ? 'border-pressci-primary bg-pressci-light' : 'border-gray-200 bg-white'
                }`}
              >
                <span>
                  <span className="block font-semibold text-gray-800">{p.nom}</span>
                  <span className="block text-xs text-gray-500">{p.commune ?? '—'}</span>
                </span>
                {actif && (
                  <span className="rounded-full bg-pressci-primary px-2 py-0.5 text-[10px] font-bold text-white">
                    ACTIF
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400">
          Les pages Tickets, Clients, Caisse et Stats affichent le pressing actif.
        </p>
      </Card>

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
      {/* ---- Informations du pressing ---- */}
      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Pressing actif : {pressing.nom}</h2>
        <Input label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
        <Input
          label="Téléphone"
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
        />
        <Input label="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        <div>
          <label htmlFor="commune" className="mb-1 block text-sm font-medium text-gray-700">
            Commune
          </label>
          <select
            id="commune"
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary"
          >
            <option value="">Choisir…</option>
            {COMMUNES_ABIDJAN.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button pleineLargeur chargement={sauvegarde} onClick={() => void sauvegarderInfos()}>
          Enregistrer
        </Button>
      </Card>

      {/* ---- Tarifs prédéfinis ---- */}
      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Tarifs des articles</h2>
        <div className="space-y-2">
          {tarifs.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{t.type_article}</span>
              <input
                type="number"
                min={0}
                step={50}
                defaultValue={t.prix_defaut}
                onBlur={(e) => void modifierPrixTarif(t, e.target.value)}
                className="w-24 rounded-card border border-gray-300 px-2 py-1.5 text-right text-sm outline-none focus:border-pressci-primary"
                aria-label={`Prix de ${t.type_article}`}
              />
              <button
                type="button"
                onClick={() => void supprimerTarif(t)}
                className="px-1 text-red-500"
                aria-label={`Supprimer ${t.type_article}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t border-gray-100 pt-3">
          <input
            type="text"
            placeholder="Nouvel article"
            value={nouveauType}
            onChange={(e) => setNouveauType(e.target.value)}
            className="flex-1 rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
          />
          <input
            type="number"
            placeholder="Prix"
            min={0}
            step={50}
            value={nouveauPrix}
            onChange={(e) => setNouveauPrix(e.target.value)}
            className="w-24 rounded-card border border-gray-300 px-2 py-2 text-sm outline-none focus:border-pressci-primary"
          />
          <button
            type="button"
            onClick={() => void ajouterTarif()}
            className="rounded-card bg-pressci-primary px-3 text-white"
            aria-label="Ajouter le tarif"
          >
            +
          </button>
        </div>
      </Card>

      {/* ---- Abonnement ---- */}
      <Card className="space-y-3 lg:col-span-2">
        <h2 className="text-sm font-semibold text-gray-700">Mon abonnement</h2>
        <div className="space-y-2">
          {PLANS.map((p) => {
            const actif = p.id === planActuel
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-card border p-3 ${
                  actif ? 'border-pressci-primary bg-pressci-light' : 'border-gray-200'
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {p.nom}{' '}
                    {actif && (
                      <span className="rounded-full bg-pressci-primary px-2 py-0.5 text-[10px] font-bold text-white">
                        ACTUEL
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-pressci-dark">
                    {p.prix === 0 ? 'Gratuit' : `${formatFCFA(p.prix)}/mois`}
                  </p>
                  {!actif && p.id !== 'gratuit' && (
                    <button
                      type="button"
                      onClick={() => void passerAuPlan(p.id)}
                      disabled={paiementEnCours !== null}
                      className="mt-1 rounded-full bg-pressci-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {paiementEnCours === p.id ? '…' : 'Choisir'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400">
          Paiement sécurisé par CinetPay — Wave et Orange Money acceptés.
        </p>
      </Card>
      </div>

      <Button
        pleineLargeur
        variante="outline"
        className="lg:max-w-xs"
        onClick={() => void seDeconnecter()}
      >
        Se déconnecter
      </Button>
    </div>
  )
}
