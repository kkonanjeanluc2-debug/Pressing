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

const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
