import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // This forwards any local request starting with /api
      // to your live backend on Render.
      '/api': {
        target: 'https://pocus-world-backend.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      // This tells Vite that '@' means the 'src' directory.
      '@': path.resolve(__dirname, './src'),
    },
  },
})