import axios from 'axios';

/**
 * In production (Netlify), set VITE_API_BASE_URL to your Render API URL, e.g.:
 * https://your-render-service.onrender.com/api
 *
 * In dev, this will default to "/api" and go through Vite proxy (vite.config.js).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: false,
});

export default api;
