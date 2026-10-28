# Under One Roof

A storefront for a handcraft brand that sells torans, toran garlands, wall and door hangings, and jewelry. The front end is plain HTML, CSS and JavaScript with no build step and is hosted on GitHub Pages. The backend is **Supabase** (project `under-one-roof`, ref `udgpsxfixpvededukhod`, Mumbai region).

## Pages
- `index.html`: The opening sequence (an interactive pixel field, then a spool and needle driven by scroll that reveals the brand name and tears away), the category shelf, the multi-lane worktable carousel and the full collection.
- `category.html?c=<slug>`: The needle stitches a looping path down the page, and the pieces hang off it like milestones.
- `product.html?id=<id>`: A **gallery** of the piece's pictures (taped polaroids under the main picture; swipe on phones, arrow keys on computers) with a *peel and place* transition: the picture peels away like a photo lifted off the page while the next is put down and taped, with a short red stitch between them (a plain fade in Calm mode). Then: A product with no background that wobbles like jelly, a sliding panel for colour, story and price, approved reviews and a review form for signed-in members. It also has **Share on WhatsApp** (the phone's own share sheet on mobile, otherwise WhatsApp with no fixed number, so shoppers can send the piece to family), a **Request a custom version** link, and **You might also like** (pieces from shelves that go together: torans, garlands and hangings; oxidised with gold & silver-tone jewelry, same colours first).
- **Recently viewed:** the last 8 pieces a shopper opened appear above the footer on every page. They're stored in that browser only.
- `faq.html`: Delivery & FAQ, with sections you can link to (`faq.html#delivery`, `#making`, `#returns`, `#custom`, `#care`, `#payments`, `#whatsapp`). **Every answer marked "Fill in" is a placeholder.** Replace the example text in `faq.html` (English) and in `assets/js/i18n-strings.js` (`f.a1`… for Telugu and Hindi) with your real policies.
- `account.html`: Sign in, create an account, Google (once it's switched on), forgotten and reset password. Once signed in: your name, your notes with their approval status, and your synced wishlist.
- `blog.html`: The journal. It has three **placeholder** posts, labelled as such on the page.
- `about.html`: The brand story. The copy is general on purpose, so swap in your own details.
- `collection.html?c=<slug>`: A curated collection (made on the admin page). Only live collections show: published, and inside their start and end dates. One can also appear as a banner on the homepage.
- `admin.html`: The shop admin (see **Admin page** below). Not linked from the shop and hidden from search engines.
- `contact.html`: A **custom piece request** form (base piece, colour, size, quantity, occasion, needed-by date and notes, sent to WhatsApp as a structured message; `contact.html?custom=<id>&colour=<key>` pre-fills it), followed by a WhatsApp chat starter.

## Languages: English, Telugu, Hindi
- Shoppers switch language from the header (or the menu on phones). The choice is remembered, and `?lang=en|te|hi` in a link sets it too.
- **Interface text** is in `assets/js/i18n-strings.js`. Static page text keeps its English in the HTML (`data-i18n="key"`), and only Telugu and Hindi live in that file.
- **Catalog text** (names, descriptions, shelf titles, care notes) lives in each row's `i18n` column in Supabase. Edit `supabase/catalog-i18n.json`, run `python tools/load-catalog-i18n.py > supabase/catalog-i18n.sql`, then run that SQL in Supabase. A missing field falls back to English.
- **⚠ All Telugu and Hindi text is machine-drafted.** Have a native speaker review both files before you launch.
- WhatsApp messages sent to the shop are always in English, with English names, so the shop can read every order.

## WhatsApp
Set the shop's number in `assets/js/config.js` → `UOR.WHATSAPP.number`, with the country code (for example `'+91 98765 43210'`). Once it's set:
- a WhatsApp button appears in the corner of every page. On a product page it pre-fills the piece's name and link; on a shelf page, the shelf's name.
- the Contact page form opens WhatsApp with the shopper's message.

**Ordering:** each wishlist piece has a quantity (1–20) and a colour. In the wishlist drawer and on the account page, shoppers can change quantities, remove pieces and press **Order these on WhatsApp**. That opens WhatsApp with a numbered list of every piece, colour and quantity, plus the total, asking for prices and availability. Product pages have a quantity stepper next to **Add to wishlist**. For signed-in members, quantities and colours sync to `wishlist_items.qty` and `wishlist_items.colour`.

Prices aren't shown on the site. Each product's Price panel says "Price on request" and has an **Ask the price on WhatsApp** button that pre-fills the piece, the chosen colour and a link to the piece. Prices aren't stored anywhere: the `products` table has no price column and the bundled catalog has no prices.

Until it's set, the corner button stays hidden and the Contact page says chat is coming soon. The old `contact_messages` table in Supabase is no longer used by the site and is safe to drop.

## Admin page (`admin.html`)
Open `https://anayinjnani25.github.io/under-one-roof/admin.html` and sign in with the shop account (anayinjnani25@gmail.com, via Google). Anyone else who signs in sees "You don't have access" and nothing more. Admin rights are rows in the `admins` table; every change is checked by Supabase itself (`private.is_admin()` in the row-level security rules), not just by the page.
- **Products:** search and filter by shelf, shown/hidden and stock. Add or edit a piece: English, Telugu and Hindi text, shelf, colours, background, drawing, sort order, published, and **stock** (In stock, Made to order, Sold out). Photos are resized to 1600px WebP in your browser (plus a 600px copy for phones) before upload. **Remove** hides a piece (nothing is lost); **Delete permanently** also removes it from wishlists and collections and deletes its reviews and photos, and tells you how many first.
- **Stock in the shop:** "Sold out" and "Made to order" badges on cards and product pages. Sold-out pieces can't be added to a wishlist and are left out of the WhatsApp order message, with a note in the wishlist; the product page offers a custom version instead.
- **More photos (gallery):** in a product's editor, the main photo is picture 1 (and the one shown on cards everywhere). Under *More photos*, add as many as you like (several at once), drag them into order, and optionally tag a photo with a colour so choosing that colour on the shop jumps to it. These save straight away. Pieces with no photos show their drawing in each of their colours instead.
- **Collections:** title (plus Telugu/Hindi), blurb, cover piece, pieces in order (drag, or use the arrows), published, optional start and end dates, and "show as homepage banner" (one at a time).
- **Reviews:** approve, unapprove or reject with one click.
- **Notifications:** the bell counts new reviews waiting for approval, live. Opening one or "Mark all read" clears it for good, in every tab.
- **Customers:** a read-only list of members (name, email, joined, wishlist size). To switch it off, set `FEATURES.customers = false` at the top of `assets/js/admin.js`.
- Orders aren't recorded anywhere: shoppers order by WhatsApp, so the WhatsApp chat is the order record.
- Offline, the shop shows a small "You're offline" banner and keeps working; the admin page refuses to save until you're back online.

## Design: "The Paper Atelier"
A luxury maker's journal: cream paper, cut-out pieces with sticker edges, torn word strips, taped polaroids, rubber stamps, one red thread.
- `assets/css/atelier.css` holds the design system (colours, type, components) and each page's look; `assets/css/style.css` is the older base underneath it.
- `assets/js/atelier.js` holds the shared behaviour: torn edges, things being "placed" as you scroll, ingredient pills, the taped product clipping (`UOR.clip`), botanical sprigs (`UOR.sprig`), page-to-page transitions and the motion switch.
- `style.html` (unlinked, hidden from search) is the style tile showing every component.
- The homepage opening animation and the shelf-page thread were kept exactly as they were.
- **Motion:** the footer has a *Full motion / Calm* switch. By default the site follows the device's "reduce motion" setting; a visitor's choice is remembered (`uor-motion` in the browser) and applies everywhere, the opening animation included.
- Telugu and Devanagari fonts load only when that language is chosen.

## Header
Products (a dropdown of every shelf), Categories, Blog, About and Contact, followed by account, wishlist and Search (Ctrl K or ⌘K opens it). Below 1240px wide, the links move into a menu button.

## Backend (Supabase)
| Piece | Where | Who can do what |
|---|---|---|
| Categories | `public.categories` | Anyone can read. You edit them in the Supabase dashboard. |
| Products | `public.products` | Anyone can read rows where `published = true`. Admins edit them on `admin.html`. |
| Collections | `public.collections`, `public.collection_products` | Anyone can read live ones. Admins edit them on `admin.html`. |
| Admins | `public.admins` | Add a row (the person's user id from Authentication → Users) to make someone an admin. |
| Notifications | `public.notifications` | Created automatically for each new review. Only admins can read them. |
| Accounts | Supabase Auth + `public.profiles` | Shoppers sign up with email + password or Google. A profile row (display name) is created automatically. Each member can read and edit only their own. |
| Reviews | `public.reviews` | Signed-in members only, one per piece. A review shows publicly once you set `approved = true`; until then only its author sees it, marked "awaiting approval". |
| Wishlists | `public.wishlist_items` | Guests keep theirs in the browser. When they sign in it merges into their account and syncs across devices. Members can read and change only their own rows. |
| Photos | Storage bucket `product-images` (public) | Anyone can view them. Only admins can upload, replace or delete. |

The schema is in `supabase/migrations/`. `supabase/seed.sql` loads the starting catalog and is generated with `node supabase/export-seed.js > supabase/seed.sql`.

The site only uses the **publishable** key (`assets/js/config.js`), which is safe to make public because row-level security (RLS) controls what it can read and write. Never put the secret / service_role key in this repo.

### Everyday tasks
Products, photos, stock, collections and reviews are all handled on `admin.html`. The Supabase dashboard is only needed for shelves (`categories`), adding admins and the settings below.

The security advisor's one remaining warning, "Leaked password protection", is a switch under Authentication → Sign In / Providers → Email (it may need a paid plan).

### Sign-in settings (Supabase dashboard → Authentication)
- **URL Configuration:** set the Site URL to `https://anayinjnani25.github.io/under-one-roof/account.html`. Add `https://anayinjnani25.github.io/under-one-roof/**` and `http://localhost:8737/**` to Redirect URLs. Confirmation emails, password resets and Google all return to these addresses.
- **Emails:** Supabase's built-in email sender is for testing only. It sends a handful of emails per hour, and only to members of your Supabase team. Before launch, connect your own SMTP service (Authentication → Emails → SMTP Settings), for example Resend, Brevo or Amazon SES.
- **Google:** create an OAuth client in Google Cloud. Use the type "Web application", with redirect URI `https://udgpsxfixpvededukhod.supabase.co/auth/v1/callback`. Then paste its Client ID and Secret into Authentication → Sign In / Providers → Google. The "Continue with Google" button appears on the account page by itself once that's switched on.
- Anonymous sign-ins are not used and can stay off.

### Fallbacks
- If Supabase can't be reached, the site renders the catalog bundled in `assets/js/data.js`.
- Guests' wishlists always work, stored in the browser.

## Publishing changes
Edit the source files in `assets/js/` and `assets/css/` as usual, then run `python tools/stamp-assets.py` before you commit. It does two things:
1. **Builds the bundles** in `assets/dist/` (via `tools/build-assets.py`): every page loads `dist/core.js` (Supabase plus the shared scripts, the same on every page so browsers cache it once), its own small `dist/<page>.js`, and one stylesheet, `dist/site.css` (`dist/admin.css` on the admin page). Scripts are minified with terser through `npx`, which needs Node.js; without Node the files are just joined, which still works.
2. **Stamps a fresh `?v=` version** on every script and stylesheet link, so visitors' browsers load the new files together.

Never edit `assets/dist/` by hand: it is rebuilt every time.

**Fonts are hosted on the site** (`assets/fonts/`, with `assets/css/fonts.css`, plus `fonts-te.css` / `fonts-hi.css` that load only for Telugu or Hindi). They were downloaded once with `python tools/fetch-fonts.py`; run it again only to change fonts. All are under the SIL Open Font License. Supabase's library is pinned in `assets/vendor/`.
## Logo
Replace `assets/logo/mark.svg`. The header, footer and favicon all point to this one file. The wordmark text is `WORDMARK` in `assets/js/common.js`.
