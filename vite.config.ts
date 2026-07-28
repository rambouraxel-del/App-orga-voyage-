import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Base path.
 *
 * GitHub Pages sert le site depuis un sous-chemin (https://<user>.github.io/<repo>/).
 * On garde la valeur configurable via la variable d'environnement `BASE_PATH`
 * pour pouvoir deployer ailleurs (domaine dedie, Netlify, ouverture locale...)
 * sans toucher au code : `BASE_PATH=/ npm run build`.
 */
const BASE_PATH = process.env.BASE_PATH ?? '/App-orga-voyage-/'

export default defineConfig({
  base: BASE_PATH,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // l'enregistrement est gere manuellement dans src/pwa/registerSW.ts
      includeAssets: [
        'favicon.svg',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
      ],
      manifest: {
        id: BASE_PATH,
        name: 'Mes Aventures',
        short_name: 'Aventures',
        description:
          'Organise tes sorties, soirees, evenements, week-ends et voyages. 100% local, sans compte.',
        lang: 'fr',
        dir: 'ltr',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#6B4A34',
        background_color: '#FAF5EE',
        categories: ['travel', 'lifestyle', 'productivity'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache de tout le shell applicatif -> fonctionnement hors ligne
        // des le second chargement.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: `${BASE_PATH}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Permet de tester le service worker en `npm run dev`.
        enabled: false,
        type: 'module',
      },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
