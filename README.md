# Under One Roof

A storefront for a handcraft brand that sells torans, toran garlands, wall and door hangings, and jewelry. The front end is plain HTML, CSS and JavaScript with no build step and is hosted on GitHub Pages. The backend is **Supabase** (project `under-one-roof`, ref `udgpsxfixpvededukhod`, Mumbai region).

## Pages
- `index.html`: The opening sequence (an interactive pixel field, then a spool and needle driven by scroll that reveals the brand name and tears away), the category shelf, the multi-lane worktable carousel and the full collection.
- `category.html?c=<slug>`: The needle stitches a looping path down the page, and the pieces hang off it like milestones.
- `product.html?id=<id>`: A product with no background that wobbles like jelly, a sliding panel for colour, story and price, approved reviews and a review form.

## Backend (Supabase)
| Piece | Where | Who can do what |
|---|---|---|
| Categories | `public.categories` | Anyone can read. You edit them in the dashboard. |
| Products | `public.products` | Anyone can read rows where `published = true`. You edit them in the dashboard. |
| Reviews | `public.reviews` | Anyone can submit one. It shows on the site only after you set `approved = true`. |
| Wishlists | `public.wishlist_items` | Each visitor (an anonymous Supabase user) can read, add and remove only their own rows. |
| Photos | Storage bucket `product-images` (public) | Anyone can view them. You upload them in the dashboard. |

The schema is in `supabase/migrations/`. `supabase/seed.sql` loads the starting catalog and is generated with `node supabase/export-seed.js > supabase/seed.sql`.

The site only uses the **publishable** key (`assets/js/config.js`), which is safe to make public because row-level security (RLS) controls what it can read and write. Never put the secret / service_role key in this repo.

### Everyday tasks in the Supabase dashboard
- **Change a price or text:** Table Editor → `products` → edit the row. The site picks up the change on the next page load.
- **Hide a product:** set `published` to false.
- **Add a product:** insert a row in `products`. Give it a `category_slug`, some `colors` (palette keys from `assets/js/data.js`, such as `rust`, `ink`, `gold-pearl`) and an `art` value such as `{"type":"jhumka"}`, or simply set `image_url`.
- **Add a product photo:** Storage → `product-images` → upload a transparent PNG/WebP. Then put its file name (for example `lotus-jhumka.png`) or its full URL in that product's `image_url`.
- **Approve a review:** Table Editor → `reviews` → set `approved` to true. Delete the row to reject it.

### Fallbacks
- If Supabase can't be reached, the site renders the catalog bundled in `assets/js/data.js`.
- If anonymous sign-ins are switched off, the wishlist still works but stays in the browser.

## Logo
Replace `assets/logo/mark.svg`. The header, footer and favicon all point to this one file. The wordmark text is `WORDMARK` in `assets/js/common.js`.

## Not built yet
There is no checkout. "Add to bag" saves the piece to the wishlist and says checkout is coming soon.
