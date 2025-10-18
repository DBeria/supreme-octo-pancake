import axios from 'axios'

// In production, VITE_API_BASE_URL must be set in Netlify env to your Render URL.
// Locally, your dev proxy still works (= '/api').
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // if using cookies; remove if not needed
})

export default api
