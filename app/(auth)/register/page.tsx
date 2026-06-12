'use client'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import type { TypeCompte } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export default function RegisterPage() {
  const router = useRouter()
  const [typeCompte, setTypeCompte] = useState<TypeCompte>('personne')
  const [nomTitulaire, setNomTitulaire] = useState('')
  const [rccm, setRccm] = useState('')
  const [ncc, setNcc] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmationRequise, setConfirmationRequise] = useState(false)
  const [chargement, setChargement] = useState(false)

  async function creerCompte(e: FormEvent) {
    e.preventDefault()
    setErreur(null)

    if (nomTitulaire.trim().length < 2) {
      setErreur(
        typeCompte === 'entreprise'
          ? 'Entrez la raison sociale de votre entreprise.'
          : 'Entrez votre nom complet.'
      )
      return
    }
    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setChargement(true)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: {
        data: {
          type_compte: typeCompte,
          nom: nomTitulaire.trim(),
          rccm: rccm.trim() || null,
          ncc: ncc.trim() || null,
        },
      },
    })

    if (authError || !authData.user) {
      setChargement(false)
      setErreur(
        authError?.message.includes('already registered')
          ? 'Un compte existe déjà avec cet email. Connectez-vous plutôt.'
          : "Création du compte impossible. Vérifiez votre réseau et réessayez."
      )
      return
    }

    // Confirmation d'email activée : pas de session pour l'instant
    if (!authData.session) {
      setChargement(false)
      setConfirmationRequise(true)
      return
    }

    // Profil du titulaire (affiché sur les documents) + abonnement gratuit du compte
    await Promise.all([
      supabase.from('profils').upsert({
        user_id: authData.user.id,
        type_compte: typeCompte,
        nom: nomTitulaire.trim(),
        rccm: rccm.trim() || null,
        ncc: ncc.trim() || null,
      }),
      supabase.from('abonnements').insert({
        owner_id: authData.user.id,
        plan: 'gratuit',
        statut: 'actif',
      }),
    ])

    // Le tableau de bord guidera la création du premier pressing
    router.push('/')
    router.refresh()
  }

  if (confirmationRequise) {
    return (
      <main className="flex flex-col justify-center text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pressci-primary text-3xl text-white">
          ✉️
        </div>
        <h1 className="text-2xl font-bold text-pressci-dark">Vérifiez votre boîte mail</h1>
        <p className="mt-2 text-gray-600">
          Un email de confirmation a été envoyé à <strong>{email}</strong>. Cliquez sur le lien
          dans cet email, puis connectez-vous : vous pourrez alors créer votre pressing.
        </p>
        <Link href="/login" className="mt-6 font-semibold text-pressci-primary">
          Aller à la connexion
        </Link>
      </main>
    )
  }

  return (
    <main className="flex flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pressci-primary text-3xl font-bold text-white">
          P
        </div>
        <h1 className="text-2xl font-bold text-pressci-dark">Créer mon compte</h1>
        <p className="mt-1 text-gray-500">
          Gratuit — vous créerez votre pressing juste après
        </p>
      </div>

      <form onSubmit={creerCompte} className="space-y-4">
        {/* Type de compte */}
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">Vous êtes…</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTypeCompte('personne')}
              className={`rounded-card border p-3 text-left transition-colors ${
                typeCompte === 'personne'
                  ? 'border-pressci-primary bg-pressci-light ring-1 ring-pressci-primary'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <span className="text-xl" aria-hidden>
                👤
              </span>
              <p className="text-sm font-semibold text-gray-800">Personne physique</p>
              <p className="text-xs text-gray-500">Gérant individuel</p>
            </button>
            <button
              type="button"
              onClick={() => setTypeCompte('entreprise')}
              className={`rounded-card border p-3 text-left transition-colors ${
                typeCompte === 'entreprise'
                  ? 'border-pressci-primary bg-pressci-light ring-1 ring-pressci-primary'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <span className="text-xl" aria-hidden>
                🏢
              </span>
              <p className="text-sm font-semibold text-gray-800">Entreprise</p>
              <p className="text-xs text-gray-500">Société immatriculée</p>
            </button>
          </div>
        </div>

        <Input
          label={typeCompte === 'entreprise' ? 'Raison sociale' : 'Nom complet'}
          name="nom_titulaire"
          placeholder={typeCompte === 'entreprise' ? 'Ex : SARL Clean Express' : 'Ex : Konan Jean-Luc'}
          value={nomTitulaire}
          onChange={(e) => setNomTitulaire(e.target.value)}
          required
        />

        {typeCompte === 'entreprise' && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="N° RCCM (facultatif)"
              name="rccm"
              placeholder="CI-ABJ-…"
              value={rccm}
              onChange={(e) => setRccm(e.target.value)}
            />
            <Input
              label="NCC (facultatif)"
              name="ncc"
              placeholder="N° compte contribuable"
              value={ncc}
              onChange={(e) => setNcc(e.target.value)}
            />
          </div>
        )}

        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          label="Mot de passe"
          type="password"
          name="password"
          placeholder="6 caractères minimum"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoComplete="new-password"
          required
        />

        {erreur && (
          <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}

        <Button type="submit" pleineLargeur chargement={chargement}>
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Déjà inscrit ?{' '}
        <Link href="/login" className="font-semibold text-pressci-primary">
          Se connecter
        </Link>
      </p>
    </main>
  )
}
