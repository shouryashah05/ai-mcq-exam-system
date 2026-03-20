import React, { createContext, useEffect, useRef, useState } from 'react';
import { login as loginApi } from '../services/authService';
import { requestNavigation, showToast } from '../utils/appEvents';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const clearSession = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {
      // ignore storage cleanup errors
    }
  };

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  // Auto-logout when token expires and listen for global logout events
  const logoutTimerRef = useRef(null);

  const parseJwt = (tkn) => {
    try {
      const payload = tkn.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    // Cleanup previous timer
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    if (!token) return;

    const payload = parseJwt(token);
    if (!payload || !payload.exp) return;

    const expiresAt = payload.exp * 1000; // exp is in seconds
    const now = Date.now();
    const msLeft = expiresAt - now;

    if (msLeft <= 0) {
      // Token already expired
      clearSession();
      showToast('Session expired. Please sign in again.', { type: 'warning' });
      requestNavigation('/login');
      return;
    }

    // Schedule logout a few seconds after expiry
    logoutTimerRef.current = setTimeout(() => {
      clearSession();
      showToast('Session expired. Please sign in again.', { type: 'warning' });
      requestNavigation('/login');
    }, msLeft + 1000);

    // Listen for global logout events (e.g., api interceptor)
    const onGlobalLogout = (event) => {
      clearSession();
      requestNavigation(event?.detail?.to || '/login', { replace: event?.detail?.replace ?? true, state: event?.detail?.state });
    };
    window.addEventListener('app:logout', onGlobalLogout);

    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      window.removeEventListener('app:logout', onGlobalLogout);
    };
  }, [token]);

  const login = async (credentials) => {
    const data = await loginApi(credentials);
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const logout = () => {
    clearSession();
    showToast('You have been logged out.', { type: 'info' });
    requestNavigation('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
