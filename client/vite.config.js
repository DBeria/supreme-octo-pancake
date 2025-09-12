import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This 'resolve' section is the key.
  // It tells Vite how to handle the '@' alias.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // We also need to restore the proxy for local development.
  server: {
    proxy: {
      '/api': {
        target: 'https://pocus-world-backend.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})