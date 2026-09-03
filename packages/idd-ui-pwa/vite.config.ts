import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'IDD IDE UI Lab',
        short_name: 'IDD UI',
        description: 'Intent Driven Development UI preview',
        theme_color: '#10231f',
        background_color: '#f4f1e8',
        display: 'standalone',
        icons: [{ src: '/idd-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      }
    })
  ]
});