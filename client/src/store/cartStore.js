import { create } from 'zustand';
import { toast } from 'sonner';
import { api } from '@/api/endpoints.js';
import { track } from '@/utils/analytics.js';
import { useUI } from './uiStore.js';

const empty = { items: [], issues: [], itemCount: 0, subtotalKobo: 0 };

/** The server owns the cart (guest cookie or account). This store mirrors it for the UI. */
export const useCart = create((set) => ({
  cart: empty, loading: false,
  load: async () => { try { set({ cart: await api.cart() }); } catch { /* offline: keep last */ } },
  add: async (variantId, qty = 1, meta) => {
    try {
      const cart = await api.cartAdd(variantId, qty);
      set({ cart }); toast.success('Added to cart');
      track('add_to_cart', { items: [{ item_id: variantId, quantity: qty }], value: meta?.priceKobo ? meta.priceKobo / 100 : undefined, currency: 'NGN' });
      if (!meta?.silent) useUI.getState().open('cartOpen');
      return true;
    } catch (e) { toast.error(e.message); return false; }
  },
  setQty: async (itemId, qty) => { try { set({ cart: await api.cartQty(itemId, qty) }); } catch (e) { toast.error(e.message); set({ cart: await api.cart().catch(() => empty) }); } },
  remove: async (itemId) => { try { set({ cart: await api.cartRemove(itemId) }); toast('Removed from cart'); } catch (e) { toast.error(e.message); } },
  clearLocal: () => set({ cart: empty }),
}));
