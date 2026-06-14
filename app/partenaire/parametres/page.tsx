'use client'

import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, type FormEvent } from 'react'

export default function PartenaireParametresPage() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [chargement, setChargement] = useState(true)

  // Mot de passe
  const [mdpActuel, setMdpActuel] = useState('')
  const [mdpNouveau, setMdpNouveau] = useState('')
  const [mdpConfirm, setMdpConfirm] = useState('')
  const [mdpEnCours, setMdpEnCours] = useState(false)
  const [mdpSucces, setMdpSucces] = useState(false)
  const [mdpErreur, setMdpErreur] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { nom?: string } | undefined
      setNom(meta?.nom ?? '')
      setEmail(data.user?.email ?? '')
      setChargement(false)
    })
  }, [])

  async function changerMotDePasse(e: FormEvent) {
    e.preventDefault()
    setMdpErreur(null)
    setMdpSucces(false)

    if (mdpNouveau.length < 6) {
      setMdpErreur('Le nouveau mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (mdpNouveau !== mdpConfirm) {
      setMdpErreur('Les deux mots de passe ne correspondent pas.')
      return
    }

    setMdpEnCours(true)
    const supabase = createClient()

    // Vérifier le mot de passe actuel via une re-authentification
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: mdpActuel,
    })

    if (signInError) {
      setMdpErreur('Mot de passe actuel incorrect.')
      setMdpEnCours(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: mdpNouveau })
    if (error) {
      setMdpErreur('Impossible de modifier le mot de passe. Réessayez.')
    } else {
      setMdpSucces(true)
      setMdpActuel('')
      setMdpNouveau('')
      setMdpConfirm('')
    }
    setMdpEnCours(false)
  }

  if (chargement) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500">Gérez votre profil et votre sécurité</p>
      </div>

      {/* Profil */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-bold uppercase text-gray-400">Mon profil</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Nom</p>
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
              {nom || '—'}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Adresse e-mail</p>
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
              {email}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Pour modifier votre nom ou e-mail, contactez l&apos;administrateur.
          </p>
        </div>
      </Card>

      {/* Mot de passe */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-bold uppercase text-gray-400">Modifier le mot de passe</h2>
        <form onSubmit={(e) => void changerMotDePasse(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={mdpActuel}
              onChange={(e) => setMdpActuel(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-pressci-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={mdpNouveau}
              onChange={(e) => setMdpNouveau(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="6 caractères minimum"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-pressci-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={mdpConfirm}
              onChange={(e) => setMdpConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-pressci-primary"
            />
          </div>

          {mdpErreur && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{mdpErreur}</p>
          )}
          {mdpSucces && (
            <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
              Mot de passe modifié avec succès.
            </p>
          )}

          <button
            type="submit"
            disabled={mdpEnCours}
            className="rounded-full bg-pressci-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-pressci-dark disabled:opacity-60"
          >
            {mdpEnCours ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </Card>
    </div>
  )
}
