'use client'

import Link from 'next/link'
import {
  BarChart3,
  BookOpen,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Tag,
  Ticket,
  Users,
} from 'lucide-react'
import React, { useState } from 'react'

/* ─── Données des plans ─────────────────────────────────────────────────── */

type PlanId = 'gratuit' | 'pro' | 'business' | 'reseau'

interface PlanData {
  id: PlanId
  nom: string
  prix_mensuel: number
  prix_annuel: number
  description: string
  badge: string | null
  accentue: boolean
  couleurBadge: string
  fonctionnalites: Array<{ texte: string; inclus: boolean }>
  cta: string
}

const PLANS_LANDING: PlanData[] = [
  {
    id: 'gratuit',
    nom: 'Gratuit',
    prix_mensuel: 0,
    prix_annuel: 0,
    description: 'Pour démarrer sans risque',
    badge: null,
    accentue: false,
    couleurBadge: '',
    fonctionnalites: [
      { texte: '1 pressing', inclus: true },
      { texte: '20 tickets / mois', inclus: true },
      { texte: 'Tableau de bord', inclus: true },
      { texte: 'Gestion des clients', inclus: true },
      { texte: 'Application mobile (PWA)', inclus: true },
      { texte: 'Tickets illimités', inclus: false },
      { texte: 'Gestion des agents', inclus: false },
      { texte: 'Comptabilité SYSCOHADA', inclus: false },
      { texte: 'Notifications WhatsApp', inclus: false },
      { texte: 'Multi-pressings', inclus: false },
    ],
    cta: 'Commencer gratuitement',
  },
  {
    id: 'pro',
    nom: 'Pro',
    prix_mensuel: 5000,
    prix_annuel: 4000,
    description: 'Pour un pressing professionnel',
    badge: '⭐ Le plus populaire',
    accentue: true,
    couleurBadge: 'bg-pressci-accent text-pressci-dark',
    fonctionnalites: [
      { texte: '1 pressing', inclus: true },
      { texte: 'Tickets illimités', inclus: true },
      { texte: 'Gestion des agents', inclus: true },
      { texte: 'Statistiques complètes', inclus: true },
      { texte: 'Comptabilité SYSCOHADA', inclus: true },
      { texte: 'Notifications WhatsApp', inclus: true },
      { texte: 'PDF + logo personnalisé', inclus: true },
      { texte: 'Multi-pressings', inclus: false },
    ],
    cta: 'Essayer le Pro',
  },
  {
    id: 'business',
    nom: 'Business',
    prix_mensuel: 8000,
    prix_annuel: 6400,
    description: 'Pour plusieurs pressings',
    badge: null,
    accentue: false,
    couleurBadge: '',
    fonctionnalites: [
      { texte: '3 pressings', inclus: true },
      { texte: 'Tickets illimités', inclus: true },
      { texte: 'Gestion des agents', inclus: true },
      { texte: 'Statistiques complètes', inclus: true },
      { texte: 'Comptabilité SYSCOHADA', inclus: true },
      { texte: 'Notifications WhatsApp', inclus: true },
      { texte: 'PDF + logo personnalisé', inclus: true },
      { texte: 'Tableau de bord multi-pressings', inclus: true },
    ],
    cta: 'Essayer le Business',
  },
  {
    id: 'reseau',
    nom: 'Réseau',
    prix_mensuel: 12000,
    prix_annuel: 9600,
    description: 'Pour une chaîne de pressings',
    badge: null,
    accentue: false,
    couleurBadge: '',
    fonctionnalites: [
      { texte: 'Pressings illimités', inclus: true },
      { texte: 'Tickets illimités', inclus: true },
      { texte: 'Tout le plan Business inclus', inclus: true },
      { texte: 'Vue consolidée multi-pressings', inclus: true },
      { texte: 'Tableau de bord centralisé', inclus: true },
      { texte: 'Rapports par pressing', inclus: true },
      { texte: 'Agents & permissions par pressing', inclus: true },
      { texte: 'Support prioritaire', inclus: true },
    ],
    cta: 'Passer au Réseau',
  },
]

const FEATURES: Array<{
  Icone: React.ComponentType<{ className?: string }>
  couleur: string
  bg: string
  titre: string
  desc: string
}> = [
  {
    Icone: Ticket,
    couleur: 'text-pressci-primary',
    bg: 'bg-pressci-light',
    titre: 'Tickets de dépôt numériques',
    desc: 'Créez un ticket en 30 secondes : client, articles, prix, date de retrait. Numérotation automatique.',
  },
  {
    Icone: Tag,
    couleur: 'text-emerald-600',
    bg: 'bg-emerald-50',
    titre: 'Caisse & encaissements',
    desc: 'Encaissez en cash, Wave, Orange Money, MTN, Moov. Rapport de caisse imprimable avec logo.',
  },
  {
    Icone: Users,
    couleur: 'text-blue-600',
    bg: 'bg-blue-50',
    titre: 'Gestion des clients',
    desc: 'Fiche client, historique des dépôts, créances en cours, clients fidèles. Relance en un clic.',
  },
  {
    Icone: MessageCircle,
    couleur: 'text-green-600',
    bg: 'bg-green-50',
    titre: 'Notifications WhatsApp',
    desc: 'Prévenez votre client que son linge est prêt directement via WhatsApp. Zéro SMS payant.',
  },
  {
    Icone: BarChart3,
    couleur: 'text-violet-600',
    bg: 'bg-violet-50',
    titre: 'Statistiques & rapports',
    desc: 'CA par jour, semaine, mois. Top articles, top clients. Graphiques clairs pour piloter votre activité.',
  },
  {
    Icone: BookOpen,
    couleur: 'text-orange-600',
    bg: 'bg-orange-50',
    titre: 'Comptabilité SYSCOHADA',
    desc: 'Journal comptable, dépenses par code de charge, compte de résultat et balance. Conforme aux normes OHADA.',
  },
  {
    Icone: ShieldCheck,
    couleur: 'text-rose-600',
    bg: 'bg-rose-50',
    titre: 'Gestion des agents',
    desc: 'Créez des comptes agents avec permissions fines : caisse, tickets, clients, vêtements. Ouverture horodatée.',
  },
  {
    Icone: Smartphone,
    couleur: 'text-sky-600',
    bg: 'bg-sky-50',
    titre: 'Application mobile (PWA)',
    desc: "Installez l'app sur Android sans passer par le Play Store. Fonctionne hors connexion.",
  },
]

const TEMOIGNAGES = [
  {
    nom: 'Adjoua Marie',
    pressing: 'Pressing Étoile — Cocody',
    texte: "Avant je perdais des tickets papier et les clients revenaient sans ticket — impossible à retrouver. Maintenant tout est dans l'application, c'est propre et professionnel.",
    initiale: 'A',
  },
  {
    nom: 'Koné Ibrahim',
    pressing: 'Blanchisserie Moderne — Yopougon',
    texte: 'Je gère 2 pressings depuis mon téléphone. Je vois la caisse de chaque point en temps réel sans me déplacer. Mes agents ne peuvent plus tricher.',
    initiale: 'K',
  },
  {
    nom: 'Diallo Fatoumata',
    pressing: 'Pressing Prestige — Marcory',
    texte: "Le rapport de caisse imprimé avec mon logo, c'est vraiment professionnel. Mes clients font confiance à mon pressing maintenant.",
    initiale: 'D',
  },
]

function formatFCFA(n: number) {
  return n.toLocaleString('fr-FR') + ' F'
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-pressci-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

/* ─── Composant principal ───────────────────────────────────────────────── */

const PERIODES = [
  { duree: 1, label: '1 mois' },
  { duree: 3, label: '3 mois' },
  { duree: 6, label: '6 mois' },
  { duree: 12, label: '1 an', remise: true },
] as const

export default function LandingPage() {
  const [duree, setDuree] = useState<1 | 3 | 6 | 12>(1)

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">

      {/* ══════════════ NAVBAR ══════════════ */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/landing" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Pressing Ivoire" className="h-10 w-10 object-contain" />
            <span className="text-base font-bold text-pressci-dark">Pressing Ivoire</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
            <a href="#fonctionnalites" className="hover:text-pressci-primary">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-pressci-primary">Tarifs</a>
            <a href="#temoignages" className="hover:text-pressci-primary">Témoignages</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-gray-600 hover:text-pressci-primary sm:inline">
              Se connecter
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-pressci-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-pressci-dark"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative overflow-hidden bg-pressci-dark py-20 lg:py-32">
        {/* Fond décoratif */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-pressci-primary/25 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-[400px] w-[400px] rounded-full bg-pressci-primary/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, #9FE1CB 1.5px, transparent 1.5px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-6 inline-block rounded-full bg-pressci-primary/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-pressci-accent">
              🇨🇮 Fait pour la Côte d'Ivoire
            </span>

            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Fini les cahiers,{' '}
              <span className="text-pressci-accent">place au pressing professionnel</span>
            </h1>

            <p className="mb-10 text-lg leading-relaxed text-pressci-light/80 sm:text-xl">
              Pressing Ivoire remplace votre carnet de dépôts, vos tableaux Excel et vos SMS manuels
              par une application moderne — accessible depuis n'importe quel téléphone.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="w-full rounded-full bg-pressci-accent px-8 py-3.5 text-base font-bold text-pressci-dark shadow-lg transition hover:scale-105 sm:w-auto"
              >
                Commencer gratuitement →
              </Link>
              <a
                href="#tarifs"
                className="w-full rounded-full border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                Voir les tarifs
              </a>
            </div>

            <p className="mt-5 text-sm text-pressci-light/50">
              Aucune carte bancaire requise · Gratuit à vie · Installation en 2 minutes
            </p>
          </div>

          {/* Mockup app */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-sm">
              <div className="rounded-xl bg-pressci-dark/80 p-5">
                {/* Barre de navigation simulée */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <div className="h-3 w-3 rounded-full bg-green-400/60" />
                  <div className="ml-4 flex-1 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/40">
                    pressing-ivoire.app
                  </div>
                </div>
                {/* Widgets */}
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Tickets actifs', val: '47', couleur: 'text-pressci-accent' },
                    { label: 'CA du jour', val: '84 500 F', couleur: 'text-green-400' },
                    { label: 'À livrer', val: '12', couleur: 'text-orange-400' },
                    { label: 'Créances', val: '32 000 F', couleur: 'text-red-400' },
                  ].map((k) => (
                    <div key={k.label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <p className={`text-xl font-bold ${k.couleur}`}>{k.val}</p>
                      <p className="mt-1 text-[11px] text-white/50">{k.label}</p>
                    </div>
                  ))}
                </div>
                {/* Tickets simulés */}
                <div className="mt-3 space-y-2">
                  {[
                    { num: '#042', client: 'Coulibaly Mamadou', statut: 'Prêt', couleur: 'bg-green-500/20 text-green-400', montant: '3 500 F' },
                    { num: '#041', client: 'Koné Awa', statut: 'En cours', couleur: 'bg-blue-500/20 text-blue-400', montant: '7 000 F' },
                    { num: '#040', client: 'Traoré Seydou', statut: 'Déposé', couleur: 'bg-gray-500/20 text-gray-400', montant: '5 200 F' },
                  ].map((t) => (
                    <div key={t.num} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-pressci-accent">{t.num}</span>
                        <span className="text-sm text-white/80">{t.client}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${t.couleur}`}>{t.statut}</span>
                        <span className="text-sm font-semibold text-white">{t.montant}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ STATS ══════════════ */}
      <section className="border-b border-gray-100 bg-pressci-light/40 py-10">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {[
              { val: '2 min', label: 'Pour créer un ticket' },
              { val: '0 F', label: 'Pour démarrer' },
              { val: '100%', label: 'Mobile-first' },
              { val: '5 modes', label: 'De paiement acceptés' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-pressci-primary">{s.val}</p>
                <p className="mt-1 text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ DOULEURS → SOLUTIONS ══════════════ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Quittez la souffrance du carnet papier
            </h2>
            <p className="text-lg text-gray-500">
              Vous gérez votre pressing à l'ancienne ? Voici ce que Pressing Ivoire change concrètement.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* AVANT */}
            <div className="rounded-2xl border border-red-100 bg-red-50 p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-600">
                  😓 Avant
                </span>
              </div>
              <ul className="space-y-4">
                {[
                  "Cahier papier qui se perd, se mouille, s'abîme",
                  "Clients qui reviennent sans ticket — impossible de retrouver",
                  'Calculs de caisse à la main, erreurs fréquentes',
                  'SMS manuel pour prévenir les clients — oublis courants',
                  "Impossible de savoir combien on a gagné ce mois",
                  'Créances oubliées, argent perdu',
                  'Impossible de gérer plusieurs pressings',
                  'Aucune trace pour la comptabilité ou les impôts',
                ].map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-red-400">✗</span>
                    <span className="text-sm text-gray-700">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* APRÈS */}
            <div className="rounded-2xl border border-green-100 bg-green-50 p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="rounded-full bg-pressci-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  ✅ Avec Pressing Ivoire
                </span>
              </div>
              <ul className="space-y-4">
                {[
                  'Ticket numérique créé en 30 secondes depuis le téléphone',
                  'Recherche instantanée par client, numéro ou article',
                  'Caisse automatique par mode de paiement, rapport imprimable',
                  'Notification WhatsApp "linge prêt" en un clic',
                  'Statistiques CA quotidien, hebdo, mensuel sur le tableau de bord',
                  'Suivi des créances avec relance WhatsApp intégrée',
                  'Multi-pressings gérés depuis un seul compte (plan Réseau)',
                  'Journal comptable SYSCOHADA, dépenses, compte de résultat',
                ].map((s) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-pressci-primary">✓</span>
                    <span className="text-sm text-gray-700">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FONCTIONNALITÉS ══════════════ */}
      <section id="fonctionnalites" className="bg-gray-50 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Tout ce dont votre pressing a besoin
            </h2>
            <p className="text-lg text-gray-500">
              Une seule application pour piloter toute votre activité, de la réception du linge à la comptabilité.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.titre}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-pressci-primary hover:shadow-md"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}>
                  <f.Icone className={`h-6 w-6 ${f.couleur}`} />
                </div>
                <h3 className="mb-2 font-bold text-gray-900">{f.titre}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ COMMENT ÇA MARCHE ══════════════ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <h2 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Opérationnel en 5 minutes
            </h2>
            <p className="text-gray-500">Pas de formation, pas de technicien. Vous créez votre compte et vous travaillez.</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                n: '1',
                titre: 'Créez votre compte',
                desc: 'Inscrivez-vous gratuitement, entrez le nom de votre pressing. Prêt en 2 minutes.',
                cls: 'bg-pressci-light text-pressci-primary',
              },
              {
                n: '2',
                titre: 'Enregistrez un dépôt',
                desc: 'Saisissez le client, les articles, la date de retrait. Le ticket est généré automatiquement.',
                cls: 'bg-pressci-primary text-white',
              },
              {
                n: '3',
                titre: 'Gérez & encaissez',
                desc: 'Suivez chaque ticket, notifiez le client sur WhatsApp, encaissez et clôturez la caisse.',
                cls: 'bg-pressci-dark text-white',
              },
            ].map((e) => (
              <div key={e.n} className="flex flex-col items-center text-center">
                <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold shadow-lg ${e.cls}`}>
                  {e.n}
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{e.titre}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TARIFS ══════════════ */}
      <section id="tarifs" className="bg-gray-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Des tarifs clairs, sans surprise
            </h2>
            <p className="mb-8 text-gray-500">
              Commencez gratuitement. Choisissez votre durée d'engagement.
            </p>

            {/* Sélecteur de période */}
            <div className="inline-grid grid-cols-4 gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
              {PERIODES.map(({ duree: d, label, remise }) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuree(d)}
                  className={`relative rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    duree === d
                      ? 'bg-pressci-primary text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {label}
                  {remise && (
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${duree === d ? 'bg-pressci-accent text-pressci-dark' : 'bg-green-100 text-green-700'}`}>
                      −20%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS_LANDING.map((plan) => {
              const prixMensuel = duree === 12 ? plan.prix_annuel : plan.prix_mensuel
              const prixTotal = prixMensuel * duree
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    plan.accentue
                      ? 'border-pressci-primary bg-pressci-dark shadow-2xl shadow-pressci-dark/30'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className={`rounded-full px-4 py-1.5 text-xs font-bold shadow-sm ${plan.couleurBadge}`}>
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className={`text-lg font-extrabold ${plan.accentue ? 'text-white' : 'text-gray-900'}`}>
                      {plan.nom}
                    </h3>
                    <p className={`mt-1 text-xs ${plan.accentue ? 'text-pressci-light/70' : 'text-gray-500'}`}>
                      {plan.description}
                    </p>
                    <div className="mt-4">
                      <div className="flex items-end gap-1">
                        <span className={`text-3xl font-extrabold ${plan.accentue ? 'text-white' : 'text-gray-900'}`}>
                          {plan.prix_mensuel === 0 ? 'Gratuit' : formatFCFA(prixMensuel)}
                        </span>
                        {plan.prix_mensuel > 0 && (
                          <span className={`mb-1 text-xs ${plan.accentue ? 'text-pressci-light/60' : 'text-gray-400'}`}>
                            / mois
                          </span>
                        )}
                      </div>
                      {plan.prix_mensuel > 0 && duree > 1 && (
                        <p className={`mt-1 text-xs ${plan.accentue ? 'text-pressci-accent' : 'text-pressci-primary'}`}>
                          Total : {formatFCFA(prixTotal)} / {duree === 12 ? 'an' : `${duree} mois`}
                        </p>
                      )}
                    </div>
                  </div>

                  <ul className="mb-6 flex-1 space-y-2">
                    {plan.fonctionnalites.map((f) => (
                      <li key={f.texte} className="flex items-start gap-2">
                        {f.inclus ? <CheckIcon /> : <CrossIcon />}
                        <span
                          className={`text-xs ${
                            f.inclus
                              ? plan.accentue ? 'text-pressci-light/90' : 'text-gray-700'
                              : 'text-gray-300'
                          }`}
                        >
                          {f.texte}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`rounded-full py-2.5 text-center text-sm font-bold transition ${
                      plan.accentue
                        ? 'bg-pressci-accent text-pressci-dark hover:bg-pressci-light'
                        : 'border border-pressci-primary text-pressci-primary hover:bg-pressci-light'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              )
            })}
          </div>

          <p className="mt-8 text-center text-sm text-gray-400">
            Paiement sécurisé par Wave, Orange Money, MTN ou Moov Money. Résiliation possible à tout moment.
          </p>
        </div>
      </section>

      {/* ══════════════ TÉMOIGNAGES ══════════════ */}
      <section id="temoignages" className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <h2 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Ils ont fait le pas
            </h2>
            <p className="text-gray-500">Des gérants de pressing en Côte d'Ivoire qui ont transformé leur activité.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {TEMOIGNAGES.map((t) => (
              <div key={t.nom} className="rounded-2xl border border-gray-100 bg-gray-50 p-7">
                <p className="mb-6 text-sm leading-relaxed text-gray-600">
                  <span className="mr-1 text-2xl text-pressci-accent">&ldquo;</span>
                  {t.texte}
                  <span className="ml-1 text-2xl text-pressci-accent">&rdquo;</span>
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pressci-primary text-sm font-bold text-white">
                    {t.initiale}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.nom}</p>
                    <p className="text-xs text-gray-500">{t.pressing}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ CTA FINAL ══════════════ */}
      <section className="bg-pressci-dark py-20 lg:py-28">
        <div className="relative mx-auto max-w-4xl px-5 text-center">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-pressci-primary/20 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-pressci-primary/20 blur-3xl" />
          </div>
          <div className="relative z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Pressing Ivoire" className="mx-auto mb-8 h-24 w-24 object-contain" />
            <h2 className="mb-5 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              Votre pressing mérite mieux<br className="hidden sm:block" /> qu'un cahier
            </h2>
            <p className="mb-10 text-lg text-pressci-light/70">
              Rejoignez les pressings qui ont fait le choix du professionnel. Commencez gratuitement, sans carte bancaire.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-pressci-accent px-10 py-4 text-base font-bold text-pressci-dark shadow-xl transition hover:scale-105"
              >
                Créer mon compte gratuitement →
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/30 px-10 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                J'ai déjà un compte
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 sm:flex-row">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Pressing Ivoire" className="h-8 w-8 object-contain" />
            <span className="text-sm font-bold text-gray-700">Pressing Ivoire</span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Pressing Ivoire — Abidjan, Côte d'Ivoire. Tous droits réservés.
          </p>
          <div className="flex gap-5 text-xs text-gray-400">
            <Link href="/login" className="hover:text-pressci-primary">Connexion</Link>
            <Link href="/register" className="hover:text-pressci-primary">Inscription</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
