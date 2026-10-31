# UPDATE 02 - Complete build (replaces the Phase 1-2 zip)

This zip is the whole project. It supersedes `gifted-scents-update-01-phase1-2.zip`.

## If you already ran Phase 1-2
The schema changed **additively** (soft delete + demo flags, `SupportMessage`, `StockMovement`, order/support extras). No data is reset.
```bash
cd server && npm install
npx prisma generate
npx prisma migrate dev --name full_build      # additive migration
npm run db:search && npm run db:seed          # both idempotent
cd ../client && npm install && npm run dev
```
Fresh machine? Follow README.md section 2 onward.

## Notable changes since Phase 2
- Full API (auth, catalog, search, cart, checkout, Paystack + webhook idempotency, orders, reviews, support, AI, settings, admin, upload, SEO).
- Storefront + admin dashboard, Orbit of Notes testimonials, Scent Finder, AI widget.
- All ten signboard lines (Roll-Ons, Body Mists, Oil Perfume, Scented Candles, Air Fresheners, Pocket-Sized Scents, Diffusers, Body Cream, Soaps, Scrubs) are product types, categories, home-page tiles, a shop filter, nav/footer links, and have demo products.
- Prisma pinned to 6 (not 7). Multer upgraded to 2.x.
