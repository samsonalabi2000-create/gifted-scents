# Client setup required before launch

Only things that still need to come from the business owner (or the developer's accounts). Everything else is built.
Most business values are entered in **Admin > Settings** and need no developer.

## From the business owner (enter in Admin > Settings unless noted)
1. **Official business address** (Settings > Store)
2. **Business email** and **support email** (Settings > Store / Support & WhatsApp). New support requests are emailed to the support email.
3. **Business hours** and support availability text
4. **Confirm the WhatsApp number**: pre-filled as `08055806394` from the banner (Settings > Support & WhatsApp)
5. **Social links.** Pre-filled: Instagram `@giftedscents23`, TikTok `giftedscents.ng` (from the signboard). The banner shows `@giftedscents23` for TikTok and a Facebook icon, so **confirm which handles are correct**; add Facebook / X / YouTube only if they exist
6. **Delivery zones, fees, estimated times and free-delivery threshold** (Settings > Shipping). The seeded Lagos / Other States / Pickup fees are **DEMO placeholders**
7. **Official policy wording**: Privacy, Terms, Returns/Refunds, Cookie notice, Shipping text, About text, FAQ answers (Settings > Policies / Website). All currently show a visible `[PLACEHOLDER]` notice
8. **Final product catalogue**: real products, prices, stock, descriptions and notes (Admin > Products). Then run `npm run db:clear-demo` to remove the sample data
9. **Real product photos** (Admin > Products). Sample products show a branded placeholder bottle
10. **Final logo as transparent PNG / SVG** (Settings > Store > Logo). The supplied logo is a JPG on black; it is used on the dark hero and in link previews. The header uses a text wordmark in the brand fonts until a transparent logo is uploaded
11. **Confirm the brand claims** used on the site: "Authentic fragrances" (from the banner's "100% original"). Only keep claims the business can prove
12. **Brand licensing check**: the shop displays designer brand names to describe products sold. Confirm the business is entitled to sell them and is comfortable with the "not affiliated" notice on product pages
13. **Homepage hero image** (optional; default is the Gifted Scents logo artwork)

## From the developer (accounts and secrets, set as environment variables)
14. **Paystack live keys** (`PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`) and the **webhook URL** `https://<api-domain>/api/payments/webhook` saved in the Paystack dashboard
15. **AI provider key** (`AI_API_KEY`, `AI_PROVIDER`). Without it the assistant answers from the catalogue only (still grounded, just less conversational)
16. **Production image storage** credentials (Cloudinary or S3-compatible)
17. **Transactional email provider** key and a verified sender domain (`EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`)
18. **Production database** URL, **JWT secrets**, `CLIENT_URL`, `SERVER_URL`, `CORS_ORIGINS`, `COOKIE_SAMESITE`
19. **Domain name** + DNS, Google Search Console verification, Google Analytics ID and Meta Pixel ID (Settings > Analytics)
20. **First admin account**: `npm run admin:create` (see README)
