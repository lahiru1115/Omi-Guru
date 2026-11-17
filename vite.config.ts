import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The table green (global.css --color-felt) is the PWA theme colour (SPEC §11).
const FELT = '#0b5d3b';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): an update waits for the player to tap Refresh in the update
      // toast, so a Practice game is never reloaded away mid-round. See SPEC §11.
      registerType: 'prompt',
      // The glob below already precaches public/ (icons included), so don't add them twice.
      includeManifestIcons: false,
      manifest: {
        name: 'ඕමි ගුරු · Omi Guru',
        short_name: 'Omi Guru',
        description: 'Learn and play Omi (Oomi / Oombi), the Sri Lankan card game.',
        lang: 'si',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: FELT,
        background_color: FELT,
        categories: ['games', 'education'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache everything, including the self-hosted Sinhala font, so the app works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,woff,webmanifest}'],
        cleanupOutdatedCaches: true,
        // Take control of the page as soon as the service worker activates, so the first visit is
        // already offline-ready and Refresh in the update toast reloads straight into the new version.
        clientsClaim: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
