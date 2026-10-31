# Gifted Scents homepage enhancements

This is a targeted update to the existing React/Vite client. It does not replace routes, API logic, product/brand data, cart, checkout, authentication, or backend files.

## Changes included

- Uses the supplied `gifted_scents_animation.MP4` as a muted, looping hero animation when no custom hero image is configured. A still logo is shown when reduced motion is requested.
- Adds a two-lane, continuously scrolling brand-name marquee based on the existing brands API data. It pauses on hover/focus and becomes static when reduced motion is enabled.
- Adds three image-led discovery tiles for Best Sellers, Travel Sprays, and Gift Sets using the supplied screenshot's reference imagery.
- Gives the existing Scent Finder page an editorial image-led introduction without changing the quiz/recommendation logic.

## Safest installation (recommended)

1. Back up these existing files from your project first:
   - `client/src/pages/Home.jsx`
   - `client/src/pages/ScentFinder.jsx`
   - `client/src/styles/index.css`
2. Extract `gifted-scents-homepage-enhancements-patch.zip` into the root of your existing Gifted Scents project folder and allow it to overwrite those three files.
3. Confirm the new `client/public/images/` and `client/public/videos/` assets are in place.
4. In Git Bash:

   ```bash
   cd ~/Desktop/My-Projects/gifted-scents/client
   npm run lint
   npm run dev
   ```

5. Open the Vite URL printed in the terminal and check the homepage and `/scent-finder` at desktop and mobile widths.

No new npm dependencies are required.

## Notes

- The image-led tiles use the supplied screenshot as the visual reference; the collection labels are part of those cropped images, matching the reference design.
- The Travel Sprays tile links to the existing `POCKET_SCENT` product-type filter. Gift Sets links to the existing shop route because the current product schema does not expose a separate Gift Set product type.
- `npm run lint` passed in the available environment. A production Vite build could not be run here because the frontend dependencies were not installed and dependency installation timed out; run `npm run build` locally after dependencies are available.
