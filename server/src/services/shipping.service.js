import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export const listActiveZones = () => prisma.shippingZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });

/** Pure: pick the zone for a state/method from a list of zones. */
export const pickZone = (zones, { state, method = 'DELIVERY' }) => {
  if (method === 'PICKUP') return zones.find((z) => z.method === 'PICKUP') || null;
  const delivery = zones.filter((z) => z.method === 'DELIVERY');
  const s = String(state || '').trim().toLowerCase();
  return delivery.find((z) => z.states.some((x) => x.toLowerCase() === s)) || delivery.find((z) => z.isFallback) || null;
};

/** Pure: fee for a zone given a subtotal. */
export const zoneFee = (zone, subtotalKobo) =>
  zone.freeAboveKobo != null && subtotalKobo >= zone.freeAboveKobo ? 0 : zone.feeKobo;

export const quoteShipping = async ({ state, method = 'DELIVERY', subtotalKobo }) => {
  const zone = pickZone(await listActiveZones(), { state, method });
  if (!zone) throw new AppError(method === 'PICKUP' ? 'Pickup is not available right now.' : 'Delivery to your state is not available yet. Please contact us on WhatsApp.', 422, 'NO_SHIPPING_ZONE');
  return { zone, feeKobo: zoneFee(zone, subtotalKobo) };
};
