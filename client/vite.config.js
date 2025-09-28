// File: client/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig({
  // THIS IS THE CRITICAL FIX:
  // It ensures all asset paths in the final build start with "/",
  // so the browser can find your JS and CSS files from any page.
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