'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import { viderCache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import { appliquerTheme, lireTheme, type Theme } from '@/lib/theme'
import { formatFCFA } from '@/lib/utils'
import { PLANS, type Abonnement, type Plan } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Section = 'profil' | 'apparence' | 'securite' | 'abonnement'

const SECTIONS: Array<{ id: Section; label: string; icone: string }> = [
  { id: 'profil', label: 'Profil', icone: '👤' },
  { id: 'apparence', label: 'Apparence', icone: '🎨' },
  { id: 'securite', label: 'Sécurité', icone: '🔒' },
  { id: 'abonnement', label: 'Abonnement', icone: '💳' },
]

const THEMES: Array<{ id: Theme; label: string; description: string; icone: string }> = [
  { id: 'clair', label: 'Clair', description: 'Fond blanc, idéal en journée', icone: '☀️' },
  { id: 'sombre', label: 'Sombre', description: 'Repose les yeux, économise la batterie', icone: '🌙' },
  { id: 'systeme', label: 'Système', description: 'Suit le réglage de votre appareil', icone: '⚙️' },
]

export default function ParametresPage() {
  const router = useRouter()
  const { pressings, chargement: chargementPressing, recharger } = usePressing()
  const { role } = useProfil()
  const supabase = createClient()

  const [section, setSection] = useState<Section>('profil')
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  // ---- Profil ----
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [typeCompte, setTypeCompte] = useState<'personne' | 'entreprise'>('personne')
  const [nomGerant, setNomGerant] = useState('')
  const [rccm, setRccm] = useState('')
  const [ncc, setNcc] = useState('')
  const [telGerant, setTelGerant] = useState('')
  const [sauvegardeProfil, setSauvegardeProfil] = useState(false)

  // ---- Pressing concerné par l'abonnement ----
  const [pressingEditeId, setPressingEditeId] = useState<string | null>(null)
  const pressing = pressings.find((p) => p.id === pressingEditeId) ?? pressings[0] ?? null

  // ---- Apparence ----
  const [theme, setTheme] = useState<Theme>('clair')

  // ---- Sécurité ----
  const [nouveauMdp, setNouveauMdp] = useState('')
  const [confirmationMdp, setConfirmationMdp] = useState('')
  const [changementMdp, setChangementMdp] = useState(false)

  // ---- Abonnement ----
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null)
  const [paiementEnCours, setPaiementEnCours] = useState<Plan | null>(null)

  // Chargement du profil utilisateur et du thème
  useEffect(() => {
    setTheme(lireTheme())
    async function chargerProfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      setUserId(user.id)

      // Profil enregistré (documents) sinon métadonnées de l'inscription
      const { data: profil } = await supabase
        .from('profils')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>

      if (profil) {
        setTypeCompte(profil.type_compte === 'entreprise' ? 'entreprise' : 'personne')
        setNomGerant((profil.nom as string) ?? '')
        setRccm((profil.rccm as string | null) ?? '')
        setNcc((profil.ncc as string | null) ?? '')
        setTelGerant((profil.telephone as string | null) ?? '')
      } else {
        if (meta.type_compte === 'entreprise') setTypeCompte('entreprise')
        if (typeof meta.nom === 'string') setNomGerant(meta.nom)
        if (typeof meta.rccm === 'string') setRccm(meta.rccm)
        if (typeof meta.ncc === 'string') setNcc(meta.ncc)
        if (typeof meta.telephone === 'string') setTelGerant(meta.telephone)
      }
    }
    void chargerProfil()
  }, [supabase])

  // Abonnement du pressing sélectionné
  useEffect(() => {
    if (!pressing) return

    async function chargerAbonnement() {
      if (!pressing) return
      const { data } = await supabase
        .from('abonnements')
        .select('*')
        .eq('pressing_id', pressing.id)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setAbonnement(data as Abonnement | null)
    }
    void chargerAbonnement()
  }, [pressing, supabase])

  function notifier(texte: string) {
    setErreur(null)
    setMessage(texte)
  }

  async function sauvegarderProfil() {
    if (nomGerant.trim().length < 2) {
      setErreur(
        typeCompte === 'entreprise' ? 'Entrez la raison sociale.' : 'Entrez votre nom complet.'
      )
      return
    }
    setSauvegardeProfil(true)
    setMessage(null)
    setErreur(null)

    const [resProfil, resAuth] = await Promise.all([
      userId
        ? supabase.from('profils').upsert({
            user_id: userId,
            type_compte: typeCompte,
            nom: nomGerant.trim(),
            rccm: rccm.trim() || null,
            ncc: ncc.trim() || null,
            telephone: telGerant.trim() || null,
          })
        : Promise.resolve({ error: null }),
      supabase.auth.updateUser({
        data: {
          type_compte: typeCompte,
          nom: nomGerant.trim(),
          rccm: rccm.trim() || null,
          ncc: ncc.trim() || null,
          telephone: telGerant.trim(),
        },
      }),
    ])

    if (resProfil.error || resAuth.error) {
      setErreur('La sauvegarde du profil a échoué. Réessayez.')
    } else {
      notifier('Profil enregistré ✅ — il apparaîtra sur vos documents.')
    }
    setSauvegardeProfil(false)
  }

  function changerTheme(t: Theme) {
    setTheme(t)
    appliquerTheme(t)
    notifier(`Thème « ${THEMES.find((x) => x.id === t)?.label} » appliqué ✅`)
  }

  async function changerMotDePasse() {
    setMessage(null)
    setErreur(null)
    if (nouveauMdp.length < 6) {
      setErreur('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (nouveauMdp !== confirmationMdp) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }
    setChangementMdp(true)
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp })
    if (error) setErreur('Le changement de mot de passe a échoué. Réessayez.')
    else {
      notifier('Mot de passe modifié ✅')
      setNouveauMdp('')
      setConfirmationMdp('')
    }
    setChangementMdp(false)
  }

  async function deconnecterPartout() {
    if (!window.confirm('Se déconnecter de tous les appareils (téléphone, ordinateur…) ?')) return
    await supabase.auth.signOut({ scope: 'global' })
    viderCache()
    router.push('/login')
    router.refresh()
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

  if (role === 'agent') {
    return (
      <div className="px-4 py-16 text-center text-gray-600">
        <p className="mb-2 text-4xl">🔒</p>
        <p className="font-semibold">Les paramètres sont réservés au propriétaire.</p>
      </div>
    )
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
    <div className="mx-auto max-w-5xl space-y-4 px-4 pt-5">
      <header>
        <h1 className="text-xl font-bold text-pressci-dark lg:text-2xl">Paramètres</h1>
        <p className="text-sm text-gray-500">Compte, pressings, apparence et sécurité</p>
      </header>

      {message && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      <div className="lg:grid lg:grid-cols-4 lg:gap-6">
        {/* ---- Navigation des sections ---- */}
        <nav className="no-scrollbar mb-4 flex gap-2 overflow-x-auto lg:mb-0 lg:flex-col lg:gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-card px-3 py-2.5 text-sm font-medium transition-colors ${
                section === s.id
                  ? 'bg-pressci-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-pressci-light lg:bg-transparent'
              }`}
            >
              <span aria-hidden>{s.icone}</span> {s.label}
            </button>
          ))}
        </nav>

        {/* ---- Contenu de la section ---- */}
        <div className="space-y-4 lg:col-span-3">
          {/* ============ PROFIL ============ */}
          {section === 'profil' && (
            <Card className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pressci-primary text-2xl font-bold text-white">
                  {(nomGerant || email || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{nomGerant || 'Propriétaire'}</p>
                  <p className="text-sm text-gray-500">{email}</p>
                  <p className="text-xs text-gray-400">
                    {typeCompte === 'entreprise' ? 'Entreprise' : 'Personne physique'} ·{' '}
                    {pressings.length} pressing{pressings.length > 1 ? 's' : ''} ·{' '}
                    Plan {PLANS.find((p) => p.id === planActuel)?.nom}
                  </p>
                </div>
              </div>

              {/* Type de compte */}
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Type de compte
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTypeCompte('personne')}
                    className={`rounded-card border p-3 text-left ${
                      typeCompte === 'personne'
                        ? 'border-pressci-primary bg-pressci-light ring-1 ring-pressci-primary'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800">👤 Personne physique</p>
                    <p className="text-xs text-gray-500">Gérant individuel</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeCompte('entreprise')}
                    className={`rounded-card border p-3 text-left ${
                      typeCompte === 'entreprise'
                        ? 'border-pressci-primary bg-pressci-light ring-1 ring-pressci-primary'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800">🏢 Entreprise</p>
                    <p className="text-xs text-gray-500">Société immatriculée</p>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={typeCompte === 'entreprise' ? 'Raison sociale' : 'Nom complet'}
                  placeholder={
                    typeCompte === 'entreprise' ? 'Ex : SARL Clean Express' : 'Ex : Konan Jean-Luc'
                  }
                  value={nomGerant}
                  onChange={(e) => setNomGerant(e.target.value)}
                />
                <Input
                  label="Téléphone"
                  type="tel"
                  placeholder="07 07 07 07 07"
                  value={telGerant}
                  onChange={(e) => setTelGerant(e.target.value)}
                />
              </div>

              {typeCompte === 'entreprise' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="N° RCCM"
                    placeholder="CI-ABJ-…"
                    value={rccm}
                    onChange={(e) => setRccm(e.target.value)}
                  />
                  <Input
                    label="NCC (compte contribuable)"
                    placeholder="Ex : 1234567A"
                    value={ncc}
                    onChange={(e) => setNcc(e.target.value)}
                  />
                </div>
              )}

              <Input label="Email (identifiant de connexion)" value={email} disabled />

              <p className="text-xs text-gray-400">
                Ces informations apparaissent en en-tête de vos documents : rapports de caisse,
                tickets PDF et états comptables.
              </p>

              <Button pleineLargeur chargement={sauvegardeProfil} onClick={() => void sauvegarderProfil()}>
                Enregistrer le profil
              </Button>
            </Card>
          )}

          {/* ============ APPARENCE ============ */}
          {section === 'apparence' && (
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Thème de l'application</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => changerTheme(t.id)}
                    className={`rounded-card border p-4 text-left transition-colors ${
                      theme === t.id
                        ? 'border-pressci-primary bg-pressci-light ring-1 ring-pressci-primary'
                        : 'border-gray-200 bg-white hover:border-pressci-primary'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden>
                      {t.icone}
                    </span>
                    <p className="mt-1 font-semibold text-gray-800">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Le thème est mémorisé sur cet appareil. L’impression des documents reste toujours
                sur fond clair.
              </p>
            </Card>
          )}

          {/* ============ SÉCURITÉ ============ */}
          {section === 'securite' && (
            <>
              <Card className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">Changer le mot de passe</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Nouveau mot de passe"
                    type="password"
                    placeholder="6 caractères minimum"
                    value={nouveauMdp}
                    onChange={(e) => setNouveauMdp(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Input
                    label="Confirmer le mot de passe"
                    type="password"
                    placeholder="Retapez le mot de passe"
                    value={confirmationMdp}
                    onChange={(e) => setConfirmationMdp(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button pleineLargeur chargement={changementMdp} onClick={() => void changerMotDePasse()}>
                  Modifier le mot de passe
                </Button>
              </Card>

              <Card className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">Sessions</h2>
                <p className="text-sm text-gray-500">
                  Si vous pensez que quelqu’un d’autre utilise votre compte, déconnectez tous les
                  appareils : il faudra se reconnecter partout avec le mot de passe.
                </p>
                <Button pleineLargeur variante="danger" onClick={() => void deconnecterPartout()}>
                  Se déconnecter de tous les appareils
                </Button>
              </Card>

              <Card className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-700">Accès des agents</h2>
                <p className="text-sm text-gray-500">
                  Les accès et permissions des agents se gèrent sur la page de chaque pressing.
                </p>
                <Link href="/pressings" className="text-sm font-semibold text-pressci-primary">
                  Gérer mes pressings et agents →
                </Link>
              </Card>
            </>
          )}

          {/* ============ ABONNEMENT ============ */}
          {section === 'abonnement' && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-700">Abonnement</h2>
                {pressings.length > 1 && (
                  <select
                    value={pressing.id}
                    onChange={(e) => setPressingEditeId(e.target.value)}
                    aria-label="Pressing concerné"
                    className="rounded-card border border-gray-300 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-pressci-primary"
                  >
                    {pressings.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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
                Paiement sécurisé par CinetPay — Wave et Orange Money acceptés. L’abonnement est
                propre à chaque pressing.
              </p>
            </Card>
          )}

          <Button
            pleineLargeur
            variante="outline"
            className="lg:max-w-xs"
            onClick={() => void seDeconnecter()}
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  )
}
