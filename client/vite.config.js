// File: client/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig({
  // THIS IS THE FIX:
  // We are explicitly telling Vite that in production, all asset paths
  // should start from the root of the domain ('/').
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