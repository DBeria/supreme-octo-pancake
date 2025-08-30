import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This proxy redirects requests from '/api' to your backend server
    proxy: {
      '/api': {
        target: 'https://pocus-world-backend.onrender.com', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosts
        secure: false,      // Can be false if your backend is HTTP
      },
    }
  }
})