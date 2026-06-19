'use client'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { viderCache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import { emailAgent, validerTelephone } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [voirMdp, setVoirMdp] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  async function seConnecter(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setChargement(true)

    const supabase = createClient()
    // Les agents se connectent avec leur numéro de téléphone :
    // on le convertit en email synthétique pour Supabase Auth.
    const identifiant = validerTelephone(email) ? emailAgent(email) : email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifiant,
      password: motDePasse,
    })

    if (error) {
      setChargement(false)
      setErreur(
        error.message.includes('Invalid login credentials')
          ? 'Identifiant ou mot de passe incorrect. Vérifiez et réessayez.'
          : 'Connexion impossible pour le moment. Vérifiez votre réseau et réessayez.'
      )
      return
    }

    // Vider le cache d'une éventuelle session précédente
    viderCache()

    // Si c'est un agent : son pressing passe « ouvert » avec l'heure d'ouverture
    if (data.user) {
      const { data: agentRow } = await supabase
        .from('agents')
        .select('pressing_id')
        .eq('user_id', data.user.id)
        .maybeSingle()
      if (agentRow) {
        await supabase.rpc('ouvrir_pressing', {
          p_pressing_id: agentRow.pressing_id as string,
        })
      }
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex flex-col justify-center">
      {/* Titre visible uniquement sur desktop (le logo est dans le panneau gauche du layout) */}
      <div className="mb-8 hidden text-center lg:block">
        <h1 className="text-2xl font-bold text-pressci-dark">Connexion</h1>
        <p className="mt-1 text-gray-500">Bienvenue sur Pressing Ivoire</p>
      </div>

      <form onSubmit={seConnecter} className="space-y-4">
        <Input
          label="Email ou téléphone (agent)"
          type="text"
          name="email"
          placeholder="vous@exemple.com ou 07 07 07 07 07"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <div className="w-full">
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={voirMdp ? 'text' : 'password'}
              placeholder="••••••••"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete="current-password"
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

        {erreur && (
          <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}

        <Button type="submit" pleineLargeur chargement={chargement}>
          Se connecter
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-semibold text-pressci-primary">
          Créer mon compte
        </Link>
      </p>
    </main>
  )
}
