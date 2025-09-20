// client/vite.config.prod.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// THIS CONFIG IS FOR THE LIVE (PRODUCTION) SITE
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: ['react-rnd']
    }
  }
})