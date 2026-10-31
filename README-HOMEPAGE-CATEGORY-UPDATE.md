# Gifted Scents homepage update

This is a targeted update for the existing Gifted Scents frontend. It removes the duplicate Featured Brands grid (the animated fragrance-house marquee remains), adds image-led category cards, and redesigns the Beyond Perfume product-line showcase.

## Apply the patch

1. Back up your current project folder or at least these files:
   - `client/src/pages/Home.jsx`
   - `client/src/styles/index.css`
2. Extract this ZIP into the **root of your existing Gifted Scents project**, so the `client/` folder merges into the current `client/` folder.
3. Allow the updated `Home.jsx` and `index.css` to replace the old versions. The `public/images/home-categories/` and `public/images/home-product-lines/` folders are new image assets.
4. From Git Bash run:

   ```bash
   cd ~/Desktop/My-Projects/gifted-scents/client
   npm run lint
   npm run dev
   ```

5. Verify the homepage at the Vite URL. The category links still use the category `slug` returned by the existing API, and product-line cards keep the existing `lineHref(type)` URLs.

## Scope

- Removes only the duplicate Featured Brands card grid. The animated brand marquee and its data-driven links remain.
- Keeps existing category names and destinations from the API.
- Keeps the existing `PRODUCT_LINES` data, descriptions, type filters and routes.
- Does not change backend files, database schema, authentication, checkout, cart, product data or dependencies.

The added category/product-line images are editorial illustrative imagery for category navigation, not photographs of specific inventory items. Product names, category labels and links remain sourced from the existing application.
