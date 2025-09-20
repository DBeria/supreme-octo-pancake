import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // --- THIS IS THE FIX ---
  // This section tells the build process to treat 'react-rnd'
  // as an external module, which resolves the error.
  build: {
    rollupOptions: {
      external: ['react-rnd']
    }
  }
})