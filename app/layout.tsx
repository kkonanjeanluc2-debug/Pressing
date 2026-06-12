import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PressCI — Gestion de pressing',
  description:
    "Gérez votre pressing depuis votre téléphone : dépôts, clients, caisse, SMS. Conçu pour la Côte d'Ivoire.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PressCI',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F6E56',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen bg-gray-50">{children}</div>
      </body>
    </html>
  )
}
