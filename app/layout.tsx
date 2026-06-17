import { SCRIPT_THEME } from '@/lib/theme'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pressing Ivoire — Gestion de pressing',
  description:
    "Gérez votre pressing depuis votre téléphone : dépôts, clients, caisse, notifications. Conçu pour la Côte d'Ivoire.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pressing Ivoire',
  },
  icons: {
    apple: [{ url: '/api/pwa-icon', sizes: '180x180', type: 'image/png' }],
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
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applique le thème avant le premier rendu (pas de flash) */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body>
        <div className="min-h-screen bg-gray-50">{children}</div>
      </body>
    </html>
  )
}
