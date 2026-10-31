import { create } from 'zustand';
export const useUI = create((set) => ({
  cartOpen: false, searchOpen: false, chatOpen: false, filtersOpen: false, menuOpen: false,
  open: (k) => set({ [k]: true }), close: (k) => set({ [k]: false }), toggle: (k) => set((s) => ({ [k]: !s[k] })),
}));
