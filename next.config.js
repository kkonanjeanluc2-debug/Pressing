/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Pages principales de l'application
      urlPattern: /^https?:\/\/[^/]+\/(tickets|clients|caisse|stats|parametres)?$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 5,
      },
    },
    {
      // Données Supabase REST (tickets récents, clients)
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-data-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 12 * 60 * 60 },
        networkTimeoutSeconds: 8,
      },
    },
    {
      // Assets statiques
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
})

/** Headers de sécurité HTTP appliqués à toutes les routes. */
const SECURITY_HEADERS = [
  // Empêche l'intégration dans une iframe (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Empêche le sniffing de type MIME
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limite les infos de provenance transmises aux sites tiers
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Désactive les fonctionnalités navigateur inutilisées
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Active le filtrage XSS du navigateur (ancien IE/Chrome, défense en profondeur)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Préchargement DNS activé pour les assets Supabase
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
