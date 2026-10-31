# Gifted Scents

Premium Nigerian fragrance & personal-care e-commerce platform.
**Storefront** (React + Vite + Tailwind) · **Admin dashboard** · **REST API** (Node + Express) · **PostgreSQL + Prisma 6** · **Paystack (NGN)** · **Grounded AI assistant** · **Support system**.

```
gifted-scents/
├── client/   React storefront + /admin  (Vite, Tailwind v4, Zustand, TanStack Query, RHF + Zod)
├── server/   Express API, Prisma schema, seed, tests
├── docs/     API.md, ADMIN_GUIDE.md
├── PRODUCTION_CHECKLIST.md   CLIENT_SETUP_REQUIRED.md
```

## 1. Requirements
Node **20.11+**, npm 10+, PostgreSQL **14+** (with permission to `CREATE EXTENSION pg_trgm`), Git Bash on Windows is fine.

## 2. Install (Git Bash)
```bash
cd server && npm install
cd ../client && npm install
```

## 3. Database
```bash
# create an empty database first (psql):  CREATE DATABASE gifted_scents;
cd server
cp .env.example .env            # then edit DATABASE_URL and the two JWT secrets
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init     # first time; creates the tables
npm run db:search                      # pg_trgm search indexes + data-integrity checks (idempotent)
npm run db:seed                        # reference data + clearly-labelled DEMO data (idempotent)
```
Already ran the earlier Phase 1-2 migration? Just run `npx prisma migrate dev --name phase3_full_build`: all changes are additive and **no data is reset**.
Generate secrets with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Seed without demo products: `SEED_DEMO=false npm run db:seed`. Remove demo rows later: `npm run db:clear-demo` (touches only rows flagged `isDemo`).

## 4. Create the admin account
```bash
cd server
ADMIN_EMAIL=owner@yourdomain.com ADMIN_PASSWORD='a-long-unique-password' ADMIN_NAME="Owner Name" npm run admin:create
# staff (orders, customers, inventory, support only):
ADMIN_EMAIL=staff@yourdomain.com ADMIN_PASSWORD='...' ADMIN_ROLE=STAFF npm run admin:create
```
Sign in at `/login`; admins are sent to `/admin`.

## 5. Run in development (two terminals)
```bash
# terminal 1
cd server && npm run dev        # http://localhost:5000/api/health
# terminal 2
cd client && cp .env.example .env && npm run dev     # http://localhost:5173
```
Vite proxies `/api` and `/uploads` to the server, so cookies work on one origin. `VITE_USE_MOCK=true` serves fake catalogue data for UI work only and **is ignored in production builds**.

## 6. Build, test, lint
```bash
cd server && npm test && npm run lint && npx prisma validate
cd ../client && npm run lint && npm run build
```
* `npm test` (server): pure-logic tests plus an HTTP-wiring suite that boots the real Express app against a **stubbed DB** (routing, validation, auth guards, CSRF, webhook signature).
* `npm run test:integration`: real-DB tests (auth refresh-token reuse, RBAC, stock validation, duplicate-webhook idempotency). Needs a throw-away database: `TEST_DATABASE_URL=postgresql://... npx prisma migrate deploy` then run it. **Never point it at production.**

## 7. Environment variables (server/.env)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | 32+ random chars each. Required in production |
| `CLIENT_URL`, `SERVER_URL`, `CORS_ORIGINS` | Site URL (CORS, Paystack callback, emails, sitemap), API URL, extra allowed origins |
| `COOKIE_SAMESITE`, `COOKIE_DOMAIN` | `lax` when site and API share a site; `none` (HTTPS only) for separate domains |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET` | Payments. Secret stays server-side |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | Assistant provider (`anthropic`, `openai`-compatible, `none`) |
| `STORAGE_PROVIDER` + `CLOUDINARY_*` / `S3_*` | Image storage (`local`, `cloudinary`, `s3`) |
| `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | `console` (log only) or `resend` |
| `WHATSAPP_NUMBER` | Fallback only; the live value is edited in Admin > Settings |

Client (`client/.env`): `VITE_API_URL` (blank in dev; full API URL in production), `VITE_SITE_URL`, `VITE_USE_MOCK` (dev only). **Nothing secret ever goes in a `VITE_` variable.**

## 8. Paystack setup
1. Create a Paystack account; copy the **test** keys into `server/.env`.
2. Dashboard > Settings > API Keys & Webhooks > set the webhook URL to `https://<your-api>/api/payments/webhook` (use a tunnel such as ngrok for local testing).
3. Test with Paystack's test cards. Flow: checkout creates the order from the *server-side* cart, recalculates totals, initialises Paystack, redirects the customer; on return `/checkout/callback` calls the API which **verifies with Paystack** (reference, amount, currency). The webhook does the same verification, de-duplicated by the unique `(gateway, eventKey)` row. Stock is deducted once, inside the same transaction that marks the order paid.
4. Go live: swap in live keys and re-save the webhook URL. Details in `PRODUCTION_CHECKLIST.md`.

Bank-transfer / WhatsApp orders: Admin > Orders > open order > **Confirm payment received** (audited).

## 9. AI assistant
Set `AI_PROVIDER` and `AI_API_KEY`. Each message: retrieve matching products and store facts from the database, then ask the model, then **validate**: every product id must have been retrieved, every ₦ amount in the reply must equal a real price or fee, otherwise the reply is replaced by a catalogue-only answer. Product cards are re-read from the database, so price and stock are always current. Refund, dispute, missing-order and complaint messages skip the AI and route to a human (WhatsApp / ticket). With no key it still works in catalogue-only mode. Rename or switch it off in Admin > Settings > Assistant.

## 10. Image storage
`local` (dev) writes to `server/uploads`. For production use `cloudinary` or `s3` (works with Cloudflare R2, Backblaze, MinIO via `S3_ENDPOINT`). Uploads are validated by real file type, auto-rotated, stripped of metadata, resized (max 1600px) and re-encoded to WebP. Optional packages are lazy-loaded.

## 11. Deployment
* **Database**: managed PostgreSQL (Neon, Supabase, Render, Railway…). Run `npx prisma migrate deploy` then `npm run db:search`.
* **API**: any Node host (Render, Railway, Fly, VPS). Build `npm ci && npx prisma generate && npx prisma migrate deploy`, start `npm start`, health check `/api/health`. `render.yaml` is an optional blueprint.
* **Frontend**: Vercel / Netlify / Cloudflare Pages. Build `npm run build`, publish `client/dist`. Set `VITE_API_URL=https://<api>/api` and `VITE_SITE_URL`. Edit `client/vercel.json` or `client/public/_redirects` (SPA fallback + `/sitemap.xml` proxy) and `client/public/robots.txt`.
* **Cookies**: simplest and safest is serving the API under the same site (e.g. `shop.example.com` + `api.example.com` with `COOKIE_DOMAIN=.example.com`, `COOKIE_SAMESITE=lax`). Fully separate domains need `COOKIE_SAMESITE=none`.

## 12. Architecture notes
* Money is integer **kobo** everywhere; one formatter on each side. Prices, shipping, coupons and totals are recomputed on the server at checkout.
* **Search**: PostgreSQL `pg_trgm` similarity + `ILIKE` across name, brand, SKU, family, notes, category.
* **Auth**: Argon2id, 15-minute access cookie + rotating 30-day refresh cookie (path-scoped), token-family revocation on reuse, login lockout, CSRF header guard, RBAC re-checked in the database on every request.
* **Inventory ledger** (`StockMovement`) records every change. Variants can't go below zero (also a DB check constraint).
* **Audit log** for product/price/stock/order/refund/review/settings/login actions.
* **SEO**: per-page title/description/canonical/Open Graph, JSON-LD (Product, Offer, AggregateRating & Review only when real reviews exist, BreadcrumbList, Organization, WebSite), API-served `sitemap.xml` and `robots.txt`. The storefront is a client-rendered SPA (Google renders it); for the strongest social-share previews and crawl speed consider adding a prerender service later.
* **Email / notifications** go through provider and channel registries; WhatsApp/SMS slots exist but are not enabled.

## 13. Troubleshooting
| Symptom | Fix |
|---|---|
| `Missing required environment variables` | Create `server/.env` from the example |
| `type "pg_trgm"`/extension error on `db:search` | Ask your host to enable `pg_trgm`, or run `CREATE EXTENSION pg_trgm;` as a superuser |
| Search returns nothing | Run `npm run db:search`; ensure products are published |
| Logged out on every refresh in production | Cookie settings: see Deployment > Cookies; the site must be HTTPS |
| 403 `CSRF` | Requests must come from the client (it sends `x-gs-csrf`). Custom API calls need that header |
| "Online payment is not available" | `PAYSTACK_SECRET_KEY` missing on the server |
| Prisma engine download blocked | Corporate proxy/firewall: allow `binaries.prisma.sh` |
| Images 404 after redeploy | Local storage is ephemeral on most hosts; use Cloudinary/S3 |
