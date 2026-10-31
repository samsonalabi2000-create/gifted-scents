import { create } from 'zustand';
import { api } from '@/api/endpoints.js';
import { toast } from 'sonner';

const KEY = 'gs-wishlist';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (ids) => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* ignore */ } };

/** Guests: localStorage. Signed-in: database (merged once on login). */
export const useWishlist = create((set, get) => ({
  ids: load(),
  has: (id) => get().ids.includes(id),
  toggle: async (id, signedIn) => {
    const had = get().ids.includes(id);
    const next = had ? get().ids.filter((x) => x !== id) : [...get().ids, id];
    set({ ids: next }); save(next);
    toast.success(had ? 'Removed from wishlist' : 'Saved to wishlist');
    if (signedIn) { try { await api.wishlistToggle(id); } catch (e) { set({ ids: get().ids.filter((x) => x !== id).concat(had ? [id] : []) }); toast.error(e.message); } }
  },
  syncAfterLogin: async () => {
    try {
      const local = get().ids;
      if (local.length) await api.wishlistMerge(local);
      const { ids } = await api.wishlist();
      set({ ids }); save(ids);
    } catch { /* keep local */ }
  },
  reset: () => { set({ ids: [] }); save([]); },
}));
