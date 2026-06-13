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
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadEnCours, setUploadEnCours] = useState(false)

  const pressing = pressings[0] ?? null

  // ---- Apparence ----
  const [theme, setTheme] = useState<Theme>('clair')

  // ---- Sécurité ----
  const [nouveauMdp, setNouveauMdp] = useState('')
  const [confirmationMdp, setConfirmationMdp] = useState('')
  const [changementMdp, setChangementMdp] = useState(false)

  // ---- Abonnement ----
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null)
  const [paiementEnCours, setPaiementEnCours] = useState<Plan | null>(null)

  // Retour d'un paiement GeniusPay échoué ou annulé
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('paiement') === 'echec') {
      window.history.replaceState({}, '', '/parametres')
      setSection('abonnement')
      setErreur(
        "Le paiement a échoué ou a été annulé. Aucun montant n'a été débité — vous pouvez réessayer."
      )
    }
  }, [])

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
        setLogoUrl((profil.logo_url as string | null) ?? null)
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

  // Abonnement du compte (propriétaire/entreprise)
  useEffect(() => {
    if (!userId) return

    async function chargerAbonnement() {
      const { data } = await supabase
        .from('abonnements')
        .select('*')
        .eq('owner_id', userId as string)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setAbonnement(data as Abonnement | null)
    }
    void chargerAbonnement()
  }, [userId, supabase])

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
    if (plan === 'gratuit') return
    setPaiementEnCours(plan)
    setErreur(null)
    try {
      const res = await fetch('/api/abonnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as { succes: boolean; url?: string; erreur?: string }
      if (data.succes && data.url) {
        window.location.href = data.url
        return
      }
      setErreur(data.erreur ?? "Le paiement n'a pas pu être lancé. Réessayez.")
    } catch {
      setErreur("Le paiement n'a pas pu être lancé. Vérifiez votre réseau.")
    }
    setPaiementEnCours(null)
  }

  async function uploadLogoFn(file: File) {
    if (!userId) return
    if (file.size > 2 * 1024 * 1024) {
      setErreur('Le fichier est trop grand (maximum 2 MB).')
      return
    }
    setUploadEnCours(true)
    setErreur(null)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      setErreur(
        'Upload impossible. Assurez-vous que le bucket "logos" (public) existe dans Supabase Storage.'
      )
      setUploadEnCours(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    const urlAvecTimestamp = `${publicUrl}?t=${Date.now()}`
    await supabase.from('profils').upsert({ user_id: userId, logo_url: urlAvecTimestamp })
    setLogoUrl(urlAvecTimestamp)
    notifier('Logo mis à jour ✅ — il apparaîtra en en-tête de vos documents.')
    setUploadEnCours(false)
  }

  async function supprimerLogo() {
    if (!userId) return
    await supabase.from('profils').update({ logo_url: null }).eq('user_id', userId)
    setLogoUrl(null)
    notifier('Logo supprimé.')
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
            <>
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

              {/* Type de compte (défini à la création du compte) */}
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Type de compte
                </span>
                <div className="flex items-center justify-between rounded-card border border-pressci-primary bg-pressci-light p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {typeCompte === 'entreprise' ? '🏢 Entreprise' : '👤 Personne physique'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {typeCompte === 'entreprise' ? 'Société immatriculée' : 'Gérant individuel'}
                    </p>
                  </div>
                  <span className="rounded-full bg-pressci-primary px-2.5 py-1 text-[10px] font-bold text-white">
                    ACTUEL
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Défini à la création du compte.
                </p>
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

            {/* ---- Logo de l'établissement ---- */}
            <Card className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Logo de votre établissement</h3>
                <p className="text-xs text-gray-400">
                  Affiché en en-tête de tous vos documents imprimés (caisse, comptabilité, tickets).
                </p>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-3xl text-gray-300">🏢</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label
                    htmlFor="logo-upload"
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-card border border-pressci-primary px-4 py-2 text-sm font-semibold text-pressci-primary transition-colors hover:bg-pressci-light ${uploadEnCours ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    {uploadEnCours ? '⏳ Upload en cours…' : '📤 Choisir un logo'}
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void uploadLogoFn(file)
                      e.target.value = ''
                    }}
                  />
                  <p className="text-xs text-gray-400">PNG, JPG ou SVG — taille maximale 2 MB</p>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => void supprimerLogo()}
                      className="block text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Supprimer le logo
                    </button>
                  )}
                </div>
              </div>
            </Card>
            </>
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
                Le thème est mémorisé sur cet appareil. L'impression des documents reste toujours
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
                  Si vous pensez que quelqu'un d'autre utilise votre compte, déconnectez tous les
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
            <>
              {/* Plan actuel + date d'expiration */}
              <Card className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700">Forfait actuel</h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Couvre l'ensemble de vos pressings.
                    </p>
                  </div>
                  <span className="rounded-full bg-pressci-primary px-3 py-1 text-xs font-bold text-white">
                    {PLANS.find((p) => p.id === planActuel)?.nom ?? 'Gratuit'}
                  </span>
                </div>

                {planActuel !== 'gratuit' && abonnement?.date_fin && (
                  <div className="rounded-card bg-pressci-light px-3 py-2 text-xs text-pressci-dark">
                    Abonnement valide jusqu&apos;au{' '}
                    <strong>
                      {new Date(abonnement.date_fin).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                  </div>
                )}

                {planActuel === 'gratuit' && (
                  <p className="text-xs text-gray-400">
                    Plan gratuit · 1 pressing · 20 tickets par mois
                  </p>
                )}

                <a
                  href="/landing#tarifs"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs font-semibold text-pressci-primary hover:underline"
                >
                  Comparer les forfaits →
                </a>
              </Card>

              {/* Sélecteur de plan */}
              <Card className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-700">Changer de forfait</h2>

                <div className="space-y-3">
                  {PLANS.map((p) => {
                    const actif = p.id === planActuel
                    const fonctionnalites: string[] =
                      p.id === 'gratuit'
                        ? ['1 pressing', '20 tickets / mois', 'Tableau de bord', 'Gestion clients']
                        : p.id === 'pro'
                        ? [
                            '1 pressing',
                            'Tickets illimités',
                            'Gestion des agents',
                            'Statistiques complètes',
                            'Comptabilité SYSCOHADA',
                            'Notifications WhatsApp',
                            'PDF professionnel + logo',
                          ]
                        : [
                            'Pressings illimités',
                            'Tickets illimités',
                            'Tout le plan Pro inclus',
                            'Vue consolidée multi-pressings',
                          ]
                    return (
                      <div
                        key={p.id}
                        className={`rounded-card border p-4 ${
                          actif
                            ? 'border-pressci-primary bg-pressci-light'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {p.nom}{' '}
                              {actif && (
                                <span className="rounded-full bg-pressci-primary px-2 py-0.5 text-[10px] font-bold text-white">
                                  ACTUEL
                                </span>
                              )}
                            </p>
                            <p className="text-sm font-bold text-pressci-dark">
                              {p.prix === 0 ? 'Gratuit' : `${formatFCFA(p.prix)} / mois`}
                            </p>
                          </div>
                          {!actif && p.id !== 'gratuit' && (
                            <button
                              type="button"
                              onClick={() => void passerAuPlan(p.id)}
                              disabled={paiementEnCours !== null}
                              className="rounded-full bg-pressci-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {paiementEnCours === p.id ? '…' : 'Souscrire'}
                            </button>
                          )}
                        </div>
                        <ul className="space-y-1">
                          {fonctionnalites.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-pressci-primary">✓</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-gray-400">
                  Paiement sécurisé par GeniusPay — Wave, Orange Money, MTN, Moov acceptés.
                  Résiliation possible à tout moment.
                </p>
              </Card>
            </>
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
