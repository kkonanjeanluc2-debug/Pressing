'use client'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { validerTelephone } from '@/lib/utils'
import { COMMUNES_ABIDJAN } from '@/types'
import { useState, type FormEvent } from 'react'

interface CreerPressingProps {
  /** Appelé après création avec l'id du nouveau pressing */
  surCreation: (pressingId: string) => void
  titre?: string
  sousTitre?: string
}

/**
 * Formulaire de création d'un pressing.
 * Utilisé à l'onboarding (premier pressing) et pour ajouter
 * un point de vente supplémentaire (multi-pressings).
 */
export default function CreerPressing({
  surCreation,
  titre = 'Créer mon pressing',
  sousTitre = 'Quelques infos et c’est parti',
}: CreerPressingProps) {
  const supabase = createClient()
  const [nom, setNom] = useState('')
  const [commune, setCommune] = useState('')
  const [telephone, setTelephone] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreur(null)

    if (nom.trim().length < 2) {
      setErreur('Entrez le nom de votre pressing.')
      return
    }
    if (telephone && !validerTelephone(telephone)) {
      setErreur('Le numéro de téléphone doit avoir 10 chiffres (ex : 07 07 07 07 07).')
      return
    }

    setChargement(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setErreur('Session expirée. Reconnectez-vous.')
      setChargement(false)
      return
    }

    const { data: pressing, error } = await supabase
      .from('pressings')
      .insert({
        owner_id: user.id,
        nom: nom.trim(),
        commune: commune || null,
        telephone: telephone.trim() || null,
      })
      .select('id')
      .single()

    if (error || !pressing) {
      setErreur('La création du pressing a échoué. Vérifiez votre réseau et réessayez.')
      setChargement(false)
      return
    }

    await supabase.from('abonnements').insert({
      pressing_id: pressing.id,
      plan: 'gratuit',
      statut: 'actif',
    })

    surCreation(pressing.id as string)
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pressci-primary text-3xl font-bold text-white">
          P
        </div>
        <h1 className="text-2xl font-bold text-pressci-dark">{titre}</h1>
        <p className="mt-1 text-gray-500">{sousTitre}</p>
      </div>

      <form onSubmit={creer} className="space-y-4">
        <Input
          label="Nom du pressing"
          name="nom_pressing"
          placeholder="Ex : Pressing Koffi"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
        />

        <div>
          <label htmlFor="commune" className="mb-1 block text-sm font-medium text-gray-700">
            Commune
          </label>
          <select
            id="commune"
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent"
          >
            <option value="">Choisir la commune</option>
            {COMMUNES_ABIDJAN.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Téléphone du pressing"
          type="tel"
          name="telephone"
          placeholder="07 07 07 07 07"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
        />

        {erreur && (
          <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}

        <Button type="submit" pleineLargeur chargement={chargement}>
          Créer le pressing
        </Button>
      </form>
    </main>
  )
}
