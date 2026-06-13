import { BarChart3, CreditCard, MessageCircle, Ticket, Users } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const fonctionnalites = [
    { Icone: Ticket,        texte: 'Tickets de dépôt numériques' },
    { Icone: CreditCard,    texte: 'Caisse & encaissements' },
    { Icone: Users,         texte: 'Gestion des clients' },
    { Icone: MessageCircle, texte: 'Notifications WhatsApp' },
    { Icone: BarChart3,     texte: 'Rapports & statistiques' },
  ]

  return (
    <div className="min-h-screen lg:flex">
      {/* ====== Panneau gauche — desktop uniquement ====== */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[55%] lg:flex-col lg:items-center lg:justify-center bg-pressci-dark">
        {/* Cercles décoratifs */}
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-pressci-primary/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-pressci-primary/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-bl-full bg-white/5" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-tr-full bg-white/5" />

        {/* Grille de points */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #9FE1CB 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Contenu */}
        <div className="relative z-10 flex flex-col items-center px-14 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Pressing Ivoire"
            className="mb-6 h-52 w-52 object-contain drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 0 40px rgba(159,225,203,0.25))' }}
          />
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-white">
            Pressing Ivoire
          </h1>
          <p className="mb-10 max-w-xs text-base text-pressci-light/70">
            La plateforme professionnelle de gestion de pressing en Côte d'Ivoire
          </p>

          <div className="w-full max-w-xs space-y-2.5">
            {fonctionnalites.map(({ Icone, texte }) => (
              <div
                key={texte}
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur-sm"
              >
                <Icone className="h-5 w-5 shrink-0 text-pressci-accent" />
                <span className="text-sm font-medium text-pressci-light/90">{texte}</span>
              </div>
            ))}
          </div>

          <a
            href="/landing"
            className="mt-10 text-xs text-pressci-accent/70 underline-offset-2 hover:text-pressci-accent hover:underline"
          >
            ← Voir la présentation
          </a>
          <p className="mt-3 text-xs text-pressci-light/40">
            © {new Date().getFullYear()} Pressing Ivoire — Abidjan, Côte d'Ivoire
          </p>
        </div>
      </div>

      {/* ====== Panneau droit — formulaire ====== */}
      <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-gray-50 px-5 py-10 lg:bg-white">
        {/* Logo mobile uniquement */}
        <div className="mb-6 flex flex-col items-center text-center lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Pressing Ivoire"
            className="h-32 w-32 object-contain drop-shadow-lg"
          />
          <a
            href="/landing"
            className="mt-3 text-xs font-medium text-pressci-primary underline-offset-2 hover:underline"
          >
            ← Découvrir Pressing Ivoire
          </a>
        </div>

        {/* Carte du formulaire */}
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 lg:shadow-none lg:ring-0 lg:p-0">
          {children}
        </div>
      </div>
    </div>
  )
}
