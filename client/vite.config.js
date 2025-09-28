// client/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
    // UPDATED: Added Render.com to the list of allowed hosts
    allowedHosts: ['.netlify.app', '.onrender.com', 'localhost'],
  },
  build: {
    rollupOptions: {
      external: ['react-rnd']
    }
  }
})