/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En dev, /api est relayé vers le backend Docker (même chemin qu'en production via nginx)
const API_TARGET = process.env.API_TARGET || 'http://localhost:8001'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
    },
  },
})
