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
  const [confirmMdp, setConfirmMdp] = useState('')
  const [voirMdp, setVoirMdp] = useState(false)
  const [voirConfirm, setVoirConfirm] = useState(false)
  const [codeParrainage, setCodeParrainage] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
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
    if (motDePasse !== confirmMdp) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }

    setChargement(true)

    // Création via route serveur (email_confirm: true → pas de validation mail requise)
    const res = await fetch('/api/auth/inscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: motDePasse,
        typeCompte,
        nomTitulaire: nomTitulaire.trim(),
        rccm: rccm.trim() || null,
        ncc: ncc.trim() || null,
        codeParrainage: codeParrainage.trim() || null,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setChargement(false)
      setErreur(json.erreur ?? "Création du compte impossible. Vérifiez votre réseau et réessayez.")
      return
    }

    // Connexion automatique après création
    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    })

    if (loginError) {
      setChargement(false)
      setErreur("Compte créé mais connexion échouée. Connectez-vous manuellement.")
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex flex-col justify-center">
      <div className="mb-8 text-center">
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
        {/* Mot de passe */}
        <div className="w-full">
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={voirMdp ? 'text' : 'password'}
              placeholder="6 caractères minimum"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-card border border-gray-300 bg-white py-3 pl-3 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent"
            />
            <button
              type="button"
              onClick={() => setVoirMdp((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700"
              aria-label={voirMdp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {voirMdp ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Confirmation mot de passe */}
        <div className="w-full">
          <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-gray-700">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              id="confirm_password"
              name="confirm_password"
              type={voirConfirm ? 'text' : 'password'}
              placeholder="Répétez le mot de passe"
              value={confirmMdp}
              onChange={(e) => setConfirmMdp(e.target.value)}
              autoComplete="new-password"
              required
              className={`w-full rounded-card border bg-white py-3 pl-3 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent ${
                confirmMdp && motDePasse !== confirmMdp
                  ? 'border-red-400'
                  : confirmMdp && motDePasse === confirmMdp
                    ? 'border-green-400'
                    : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setVoirConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700"
              aria-label={voirConfirm ? 'Masquer' : 'Afficher'}
            >
              {voirConfirm ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {confirmMdp && motDePasse !== confirmMdp && (
            <p className="mt-1 text-xs text-red-600">Les mots de passe ne correspondent pas.</p>
          )}
          {confirmMdp && motDePasse === confirmMdp && (
            <p className="mt-1 text-xs text-green-600">✓ Les mots de passe correspondent.</p>
          )}
        </div>

        {erreur && (
          <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Code promo <span className="font-normal text-gray-400">(facultatif)</span>
          </label>
          <Input
            name="code_parrainage"
            placeholder="Ex : kouassi1234"
            value={codeParrainage}
            onChange={(e) => setCodeParrainage(e.target.value)}
          />
        </div>

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
