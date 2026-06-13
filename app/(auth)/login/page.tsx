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
        <Input
          label="Mot de passe"
          type="password"
          name="password"
          placeholder="••••••••"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoComplete="current-password"
          required
        />

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
          Créer mon pressing
        </Link>
      </p>
    </main>
  )
}
