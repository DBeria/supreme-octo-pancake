// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/', // important for Netlify
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ⛔️ DO NOT externalize client deps; this caused the "react-rnd" error in prod
  // build: { rollupOptions: { external: ['react-rnd'] } }
})
