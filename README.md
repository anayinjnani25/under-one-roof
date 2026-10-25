# Under One Roof

A storefront for a handcraft brand that sells torans, toran garlands, wall and door hangings, and jewelry. It's plain HTML, CSS and JavaScript with no build step, so it can be hosted anywhere static, including GitHub Pages.

## Pages
- `index.html`: The opening sequence (an interactive pixel field, then a spool and needle driven by scroll that reveals the brand name and tears away), the category shelf, the multi-lane worktable carousel and the full collection.
- `category.html?c=<slug>`: The needle stitches a looping path down the page, and the pieces hang off it like milestones.
- `product.html?id=<id>`: A product with no background that wobbles like jelly, a sliding panel for colour, story and price, plus reviews.

## Swapping in real content
- **Logo:** replace `assets/logo/mark.svg`. The header, footer and favicon all point to this one file. The wordmark text is `WORDMARK` in `assets/js/common.js`.
- **Catalog:** edit `assets/js/data.js`. Each product's `art` spec draws an illustrated cut-out (`assets/js/art.js`). When real photos are ready, add `image: 'assets/products/<file>.png'` (transparent background) to the product and the site uses it everywhere.
- **Reviews:** these are placeholder samples (`UOR.reviewPool`), and every product page labels them as samples.

## Decisions made for the open questions in the brief
1. The carousel lanes move independently, one per lane.
2. There are 5 categories with 6 pieces each, a placeholder catalog.
3. Reviews are static and curated.
4. Checkout isn't built yet. "Add to bag" saves the piece to the wishlist and says checkout is coming.

## Accessibility and performance
- With `prefers-reduced-motion` turned on, the pixel field stays static, the opening shows one calm frame with no pinning and no tear, and the cards and product don't wobble or pop.
- The pixel field gets sparser on low-end devices and turns itself off if frames take too long.
- Each page has one scroll listener, and all scroll-linked motion comes from a single progress value.
