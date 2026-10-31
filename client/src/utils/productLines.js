import { Pipette, SprayCan, Droplets, Flame, Wind, Pocket, FlaskConical, Droplet, Sparkle, Layers } from 'lucide-react';

// The ten non-perfume lines from the Gifted Scents signboard. `type` matches the server ProductType enum
// (the shop filters on ?type=); the catalogue itself is database-driven, so adding products to a line needs no code.
export const PRODUCT_LINES = [
  { type: 'ROLL_ON', name: 'Roll-Ons', blurb: 'Pocket-friendly, mess-free scent', icon: Pipette },
  { type: 'BODY_MIST', name: 'Body Mists', blurb: 'Light, all-day freshness', icon: SprayCan },
  { type: 'OIL_PERFUME', name: 'Oil Perfume', blurb: 'Rich, long-lasting oils', icon: Droplets },
  { type: 'CANDLE', name: 'Scented Candles', blurb: 'Warm up any room', icon: Flame },
  { type: 'AIR_FRESHENER', name: 'Air Fresheners', blurb: 'Fresh home, fresh car', icon: Wind },
  { type: 'POCKET_SCENT', name: 'Pocket-Sized Scents', blurb: 'Take your scent anywhere', icon: Pocket },
  { type: 'DIFFUSER', name: 'Diffusers', blurb: 'Gentle fragrance, all day', icon: FlaskConical },
  { type: 'BODY_CREAM', name: 'Body Cream', blurb: 'Soft, scented skin', icon: Droplet },
  { type: 'SOAP', name: 'Soaps', blurb: 'Clean with a hint of luxury', icon: Sparkle },
  { type: 'SCRUB', name: 'Scrubs', blurb: 'Smooth, polished skin', icon: Layers },
];
export const lineByType = Object.fromEntries(PRODUCT_LINES.map((l) => [l.type, l]));
export const lineHref = (type) => `/shop?type=${type}`;
