# Production checklist

Tick every box before taking real payments.

## Business
- [ ] Real products, prices, stock, descriptions and notes entered; demo data removed (`npm run db:clear-demo`)
- [ ] Real product photos uploaded (with alt text)
- [ ] Official Privacy, Terms, Returns/Refunds, Cookie wording pasted into Settings (no `[PLACEHOLDER]` left; search the site for it)
- [ ] Contact details: address, phone, email, hours, WhatsApp number confirmed
- [ ] Delivery zones, fees, estimates, free-delivery threshold set (the seeded values are demo)
- [ ] FAQ and About text written
- [ ] Brand claims on the site (authenticity, delivery speed) are ones the business can prove
- [ ] Transparent logo uploaded

## Security
- [ ] `NODE_ENV=production`
- [ ] New random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (32+ chars each), different from dev
- [ ] HTTPS everywhere; `COOKIE_SAMESITE` set correctly (`none` only if site and API are on different sites); cookies are `Secure`
- [ ] `CORS_ORIGINS` lists only your real site origin(s)
- [ ] Strong, unique admin password; no default or shared accounts; staff accounts use the STAFF role
- [ ] `.env` is not committed (`git status`, `git log -p -- .env` is empty)
- [ ] Database user has least privilege; backups enabled and a restore tested
- [ ] `STORAGE_PROVIDER` is not `local` (ephemeral disks lose images)
- [ ] Production `VITE_USE_MOCK` unset/false

## Payment (Paystack)
- [ ] Live keys in server environment only (`PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`)
- [ ] Webhook URL `https://<api>/api/payments/webhook` saved in the Paystack dashboard (live mode)
- [ ] Test purchase end-to-end with a small real amount: order marked Paid, stock reduced once, confirmation email received
- [ ] Failed card, cancelled payment and closed-tab-then-webhook cases tested
- [ ] A second delivery of the same webhook changes nothing (replay from the Paystack dashboard)
- [ ] Refund process agreed (Admin > Order > Request Paystack refund, then mark Refunded)

## AI assistant
- [ ] Production `AI_API_KEY` and `AI_MODEL`; spend limit / alerts set at the provider
- [ ] Asked 10 real questions: prices, stock and delivery answers match the shop exactly
- [ ] "Talk to a human" opens the right WhatsApp chat

## Storage & email
- [ ] Cloudinary or S3 bucket created; upload from the admin works and images load on the live site
- [ ] Email provider key + verified sender domain; reset-password and order emails delivered to Gmail/Outlook inbox (not spam)

## SEO & analytics
- [ ] Domain live; `VITE_SITE_URL` and `CLIENT_URL` match it
- [ ] `/sitemap.xml` reachable on the site domain (proxy configured) and submitted in Google Search Console
- [ ] `robots.txt` shows the real domain in the Sitemap line
- [ ] Google Analytics / Meta Pixel IDs added in Settings > Analytics; consent banner appears and tracking waits for Accept
- [ ] Product pages pass the Rich Results Test; Lighthouse mobile run on Home, Shop, Product, Checkout

## Social
- [ ] Only real, confirmed profile URLs in Settings > Social

## Testing
- [ ] Phones: 320, 360, 375, 390, 414, 430 px wide; one tablet; laptop and 1920 px desktop. No horizontal scroll, buttons tappable
- [ ] Keyboard-only run through: menu, search, add to cart, checkout, chat
- [ ] Light and dark mode both checked
- [ ] Guest checkout, account checkout, guest cart merging after login
- [ ] Admin on a phone: add a product with photos, publish, change an order status, reply to a ticket
- [ ] `cd server && npm test` and `npm run test:integration` (against a throw-away DB) pass
