import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pressci: {
          primary: '#0F6E56',
          secondary: '#1D9E75',
          accent: '#9FE1CB',
          dark: '#085041',
          light: '#E1F5EE',
        },
        statut: {
          nouveau: '#7C3AED',
          traitement: '#EA580C',
          pret: '#16A34A',
          recupere: '#6B7280',
          annule: '#DC2626',
        },
      },
      borderRadius: {
        card: '12px',
      },
      maxWidth: {
        mobile: '430px',
      },
    },
  },
  plugins: [],
}

export default config
