// File: client/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig({
  // THIS IS THE CRITICAL FIX:
  // This tells Vite that all asset paths should start from the root of the domain ('/').
  base: '/',

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
  },
  build: {
    rollupOptions: {
      external: ['react-rnd']
    }
  }
});