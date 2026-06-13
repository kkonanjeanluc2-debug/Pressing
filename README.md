# PressCI 🧺

**Application SaaS PWA de gestion de pressing, mobile-first, pour la Côte d'Ivoire.**

Pensée pour les gérants de pressing qui gèrent encore tout au cahier : dépôts,
clients, caisse du jour, créances, notifications SMS. Fonctionne sur Android via
Chrome, installable comme une application — sans Play Store.

## Stack

| Couche | Techno |
| --- | --- |
| Frontend | Next.js 14 (App Router) + TypeScript strict + Tailwind CSS |
| Backend | Supabase (Auth, PostgreSQL + RLS, Edge Functions, Realtime) |
| Paiements | GeniusPay (mobile money) |
| SMS | Orange SMS API Côte d'Ivoire |
| Offline | next-pwa (service worker, cache des tickets et clients) |
| Graphiques | Recharts |

## Fonctionnalités

- 🔐 Authentification email/mot de passe, un pressing par gérant
- 📊 Tableau de bord temps réel (Supabase Realtime) : tickets actifs, prêts, CA, créances
- 🎫 Tickets : création rapide (client par téléphone, tarifs prédéfinis, numéro auto #001…),
  filtres, recherche, détail façon fiche de pressing, encaissement final
- 👥 Clients : fiche, historique, créances, clients fidèles (⭐ 5+ dépôts), relance SMS
- 💰 Caisse du jour : totaux par mode de paiement (cash / Wave / Orange Money),
  comparaison hier & moyenne 7 jours, clôture imprimable (PDF)
- 📈 Statistiques : CA jour/semaine/mois/personnalisé, top articles, top clients, fidélisation
- 📱 SMS Orange "votre linge est prêt" + repli WhatsApp si échec
- 💳 Abonnements GeniusPay : Gratuit (20 tickets/mois) · Pro 5 000 FCFA · Réseau 12 000 FCFA,
  vérification de la limite côté serveur + webhook signé HMAC
- 📴 PWA offline-first avec bannière hors-ligne

## Démarrage

### 1. Prérequis

- Node.js 18+
- Un projet [Supabase](https://supabase.com) (gratuit)
- Comptes [GeniusPay](https://geniuspay.ci) et [Orange Developer](https://developer.orange.com) (optionnels en dev)

### 2. Installation

```bash
npm install
```

### 3. Variables d'environnement

```bash
copy .env.local.example .env.local
```

Puis renseignez :

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (⚠️ secret) |
| `GENIUSPAY_API_KEY` (pk_…) / `GENIUSPAY_API_SECRET` (sk_…) / `GENIUSPAY_WEBHOOK_SECRET` (whsec_…) | GeniusPay → Paramètres → API |
| `ORANGE_SMS_API_KEY` | Orange Developer (Basic auth base64 `client_id:client_secret`) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app (localhost en dev) |

### 4. Base de données

```bash
npx supabase login
npx supabase link --project-ref <votre-ref-projet>
npx supabase db push
```

La migration `supabase/migrations/001_init.sql` crée :
tables (`pressings`, `clients`, `tickets`, `articles_ticket`, `tarifs`,
`abonnements`, `encaissements`), RLS sur toutes les tables, index, fonctions
(`next_ticket_numero`, `peut_creer_ticket`), triggers (compteurs clients,
tarifs par défaut) et active Realtime sur `tickets`.

### 5. Edge Functions (optionnel)

```bash
npx supabase functions deploy sms-notify
npx supabase functions deploy geniuspay-webhook --no-verify-jwt
npx supabase secrets set ORANGE_SMS_API_KEY=... ORANGE_SMS_SENDER=PressCI
npx supabase secrets set GENIUSPAY_API_KEY=pk_... GENIUSPAY_API_SECRET=sk_... GENIUSPAY_WEBHOOK_SECRET=whsec_...
```

> Les routes Next.js `app/api/sms` et `app/api/geniuspay-webhook` couvrent les
> mêmes besoins ; les Edge Functions sont une alternative serverless.

### 6. Lancer

```bash
npm run dev        # développement (PWA désactivée)
npm run build      # build production (génère le service worker)
npm start          # serveur production
npm run typecheck  # vérification TypeScript
```

Ouvrez http://localhost:3000, créez votre compte (page « Créer mon pressing ») —
10 tarifs d'articles courants sont pré-remplis automatiquement.

## Installation sur Android

1. Ouvrir l'app dans **Chrome**
2. Menu ⋮ → **« Ajouter à l'écran d'accueil »**
3. L'application se lance en plein écran, comme une app native

## Structure du projet

```
app/
├── (auth)/login, register      Authentification
├── (dashboard)/                Pages protégées (bottom nav mobile)
│   ├── page.tsx                Tableau de bord (KPI + Realtime)
│   ├── tickets/                Liste, nouveau dépôt, détail
│   ├── clients/                Liste, fiche client
│   ├── caisse/                 Caisse du jour
│   ├── stats/                  Statistiques
│   └── parametres/             Pressing, tarifs, abonnement
└── api/                        sms, abonnement, geniuspay-webhook
components/                     ui/, tickets/, dashboard/
hooks/                          usePressing, useDashboard, useTickets, useClients
lib/                            supabase/, utils, sms (Orange), GeniusPay
supabase/                       migrations/, functions/
```

## Sécurité

- **RLS partout** : chaque pressing ne voit que ses données (`auth.uid()`)
- Limite du plan gratuit vérifiée **côté serveur** (fonction SQL `peut_creer_ticket`)
- Webhook GeniusPay : signature **HMAC SHA-256** + re-vérification de la
  transaction auprès de l'API GeniusPay + idempotence
- La clé service role n'est utilisée que côté serveur (webhook)
