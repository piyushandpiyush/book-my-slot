import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState({ items: [], unread: 0 });

  const toast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const d = await authService.notifications();
      setNotifications({ items: d.notifications, unread: d.unread });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    authService.me().then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  // Personal socket for in-app notifications
  useEffect(() => {
    if (!user) { setNotifications({ items: [], unread: 0 }); return undefined; }
    loadNotifications();
    const socket = io({ withCredentials: true });
    socket.on('notification', (n) => {
      toast(`${n.title}: ${n.message || ''}`, 'success');
      setNotifications((s) => ({ items: [n, ...s.items], unread: s.unread + 1 }));
    });
    return () => socket.close();
  }, [user, toast, loadNotifications]);

  const value = useMemo(() => ({
    user, loading, toast, toasts, notifications, loadNotifications,
    markAllRead: async () => { await authService.readAll(); loadNotifications(); },
    googleLogin: async (credential, role) => { const d = await authService.google({ credential, role }); setUser(d.user); return d; },
    logout: async () => { await authService.logout(); setUser(null); },
    updateProfile: async (body) => { const d = await authService.updateProfile(body); setUser(d.user); },
  }), [user, loading, toast, toasts, notifications, loadNotifications]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
