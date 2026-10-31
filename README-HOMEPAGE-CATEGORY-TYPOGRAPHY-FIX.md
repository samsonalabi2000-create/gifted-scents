# Gifted Scents — Homepage category and typography fix

This targeted patch fixes two issues:

1. Shop by Category now remains visible even when the categories API returns an empty result or is temporarily unavailable. When live categories exist, the API remains the source of truth; the provided 12-category list is only a fallback.
2. Category headings, product-line title, and product-line names use the Cormorant Garamond editorial serif treatment and sizing closer to the approved first design. Product descriptions retain the Manrope sans-serif styling.

The patch includes the 12 category photographs and 10 product-line photographs. It does not modify the backend, database, routing configuration, checkout, cart, authentication, or product records.

## Apply

1. Back up `client/src/pages/Home.jsx` and `client/src/styles/index.css`.
2. Extract this archive into the **root** of the existing `gifted-scents` project, keeping the `client/...` paths intact.
3. From Git Bash run:

   ```bash
   cd ~/Desktop/My-Projects/gifted-scents/client
   npm run lint
   npm run dev
   ```

4. Refresh the homepage. If Vite was already running, it should hot-reload; otherwise restart it after extraction.

## Notes

- The category cards use the existing `/shop/<slug>` routes.
- The product-line cards continue to use the existing `PRODUCT_LINES` definitions and `lineHref()` helper.
- Category image assets are editorial category imagery, not claims that a specific pictured bottle is a stocked SKU.
