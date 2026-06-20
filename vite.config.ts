import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Nebula Vanguard: Space Invaders',
        short_name: 'Nebula Vanguard',
        description: 'Story-driven, offline-first Space Invaders.',
        theme_color: '#05060f',
        background_color: '#05060f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Cache the app shell so the game is fully playable offline after first load.
        navigateFallback: 'index.html'
      }
    })
  ]
});
