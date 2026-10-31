import { create } from 'zustand';
import { api } from '@/api/endpoints.js';
import { setSessionLostHandler } from '@/api/client.js';

export const useAuth = create((set, get) => ({
  user: null, ready: false,
  init: async () => {
    try { set({ user: (await api.auth.me()).user, ready: true }); } catch { set({ user: null, ready: true }); }
  },
  setUser: (user) => set({ user }),
  logout: async () => { try { await api.auth.logout(); } finally { set({ user: null }); } },
  isStaff: () => ['ADMIN', 'STAFF'].includes(get().user?.role),
  isAdmin: () => get().user?.role === 'ADMIN',
}));
setSessionLostHandler(() => useAuth.setState({ user: null }));
