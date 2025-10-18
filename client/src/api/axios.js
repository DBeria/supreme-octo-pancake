import axios from 'axios';

// Prefer env override; fallback to your Render URL
const DEFAULT_BASE = 'https://pocus-world-backend.onrender.com';
const baseURL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL)) ||
  DEFAULT_BASE;

const api = axios.create({
  baseURL,
  withCredentials: true, // allow cookies if backend sets them
});

// Optional: attach auth token if you store it
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;