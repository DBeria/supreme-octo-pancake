// client/src/lib/api.js
import axios from 'axios';
import { getToken } from './authStorage';

const api = axios.create({
  baseURL: '/', // proxy handles /api to backend
  withCredentials: true,
});

// Attach token if present
api.interceptors.request.use((config) => {
  const tok = getToken();
  if (tok) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${tok}`;
  }
  return config;
});

export default api;
