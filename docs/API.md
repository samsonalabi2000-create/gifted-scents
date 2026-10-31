# API reference

Base path `/api`. JSON in/out: `{ "success": true, "data": … }` or `{ "success": false, "error": { "code", "message", "details?" } }`.
Auth is via httpOnly cookies. Every non-GET request must carry header `x-gs-csrf: 1` (the web client adds it). Money is integer **kobo**.

## Public
| Method & path | Notes |
|---|---|
| `GET /health` | DB-checked liveness |
| `GET /settings/public` | Store settings (non-secret) |
| `GET /products` | Filters: `category brand gender family note longevity sillage type occasion size minPrice maxPrice(₦) inStock sale bestseller new featured ids sort page limit` |
| `GET /products/facets` | Filter options |
| `GET /products/:slug` · `/:slug/recommendations` · `/:id/reviews` | Detail, related rows, approved reviews |
| `GET /brands` `/brands/:slug` `/categories` `/categories/:slug` `/fragrance-families` `/fragrance-families/:slug` | Taxonomy |
| `GET /search?q=` · `/search/suggest?q=` · `/search/popular` | pg_trgm search |
| `POST /scent-finder/recommend` | Quiz answers → in-stock matches with reasons |
| `GET /cart` · `POST /cart/items` · `PATCH/DELETE /cart/items/:id` · `GET /cart/quote?state&method&coupon` | Guest (cookie) or account cart |
| `GET /shipping/zones` | Active zones |
| `POST /orders` | **Checkout**: validates server cart, creates order, initialises Paystack → `{ order, payment.authorizationUrl }` |
| `GET /orders/lookup?orderNumber&token` | Guest order view |
| `POST /payments/initialize/:orderId` | Retry payment (owner or guest token) |
| `GET /payments/verify/:reference` | Server-side verification, idempotent |
| `POST /payments/webhook` | Paystack, HMAC-SHA512 verified over the raw body |
| `POST /support` · `POST /support/handoff` | Tickets, chat handoff |
| `GET /ai/config` · `POST /ai/chat` | Assistant |
| `POST /newsletter` · `GET /reviews` (homepage) | |
| `GET /whatsapp-link?text=` | Built from the configured number |
| `GET /sitemap.xml`, `GET /robots.txt` | At server root (not under `/api`) |

## Authenticated (customer)
`POST /auth/register|login|refresh|logout|forgot-password|reset-password` · `GET /auth/me` · `GET|PATCH /users/me` · `POST /users/me/password` · `GET|POST /users/me/addresses` · `PUT|DELETE /users/me/addresses/:id` · `GET /users/me/orders|tickets` · `GET /orders/:id` · `GET /wishlist` · `POST /wishlist/:productId/toggle` · `POST /wishlist/merge` · `POST /reviews` (purchasers only)

## Admin / staff (`/admin/*`; role + permission checked server-side)
| Area | Endpoints | Who |
|---|---|---|
| Dashboard | `GET /admin/dashboard` | Admin, Staff |
| Analytics | `GET /admin/analytics?days=` | Admin |
| Products | `GET/POST /admin/products` · `GET/PUT/DELETE /admin/products/:id` · `PATCH …/publish` · `POST …/duplicate` | read: Admin+Staff, write: Admin |
| Inventory | `GET /admin/inventory/low` · `POST /admin/inventory/adjust` | Admin, Staff |
| Taxonomy | `/admin/brands`, `/categories`, `/fragrance-families` (CRUD) | Admin (read: Staff) |
| Orders | `GET /admin/orders` · `GET /:id` · `PATCH /:id/status` · `POST /:id/confirm-payment` · `POST /:id/refund` | Admin, Staff (refund: Admin) |
| Customers | `GET /admin/customers` · `/:id` · `PATCH /:id/active` | Admin, Staff (deactivate: Admin) |
| Reviews | `GET/PATCH/DELETE /admin/reviews` | Admin |
| Support | `GET /admin/support` · `/:id` · `POST /:id/reply` · `POST /:id/note` · `PATCH /:id/status` | Admin, Staff |
| Settings | `GET/PUT /admin/settings` · `/admin/shipping-zones` · `/admin/coupons` · `GET /admin/audit` | Admin |
| Upload | `POST /upload/image` (multipart `image`) | Admin |

Permissions: ADMIN everything; STAFF = orders, customers, inventory, support, product read; CUSTOMER = own data only.
