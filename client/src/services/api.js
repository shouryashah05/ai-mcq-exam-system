import axios from 'axios';
import { requestLogout, showToast } from '../utils/appEvents';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Global response handler: if server returns 401, trigger app logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const requestUrl = err?.config?.url || '';
    const isLoginRequest = /\/auth\/login$/.test(requestUrl);
    const isSessionProbe = /\/auth\/me$/.test(requestUrl);

    if (status === 401 && !isLoginRequest) {
      try {
        localStorage.removeItem('user');
        // Inform the app that a logout should happen (AuthContext listens for this)
        requestLogout({ to: '/login' });
        // notify user
        if (!isSessionProbe) {
          showToast('Session expired or unauthorized. Please login again.', { type: 'warning' });
        }
      } catch (e) {
        // no-op
      }
    }
    return Promise.reject(err);
  }
);

export default api;
