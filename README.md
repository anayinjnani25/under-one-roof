# Under One Roof

A storefront for a handcraft brand that sells torans, toran garlands, wall and door hangings, and jewelry. The front end is plain HTML, CSS and JavaScript with no build step and is hosted on GitHub Pages. The backend is **Supabase** (project `under-one-roof`, ref `udgpsxfixpvededukhod`, Mumbai region).

## Pages
- `index.html`: The opening sequence (an interactive pixel field, then a spool and needle driven by scroll that reveals the brand name and tears away), the category shelf, the multi-lane worktable carousel and the full collection.
- `category.html?c=<slug>`: The needle stitches a looping path down the page, and the pieces hang off it like milestones.
- `product.html?id=<id>`: A product with no background that wobbles like jelly, a sliding panel for colour, story and price, approved reviews and a review form for signed-in members.
- `account.html`: Sign in, create an account, Google (once it's switched on), forgotten and reset password. Once signed in: your name, your notes with their approval status, and your synced wishlist.
- `resources.html`: Care guides (text comes from each category's `care` column in Supabase) and a hanging & sizing guide.
- `blog.html`: The journal. It has three **placeholder** posts, labelled as such on the page.
- `about.html`: The brand story. The copy is general on purpose, so swap in your own details.
- `contact.html`: A contact form saved to `public.contact_messages`. The site can only add messages, so read and answer them in the dashboard and tick `handled` once you've replied. The email and Instagram lines are **placeholders**.

## Header
Products (a dropdown of every shelf), Categories, Resources, Blog, About and Contact, followed by account, wishlist and Search (Ctrl K or ⌘K opens it). Below 1240px wide, the links move into a menu button.

## Backend (Supabase)
| Piece | Where | Who can do what |
|---|---|---|
| Categories | `public.categories` | Anyone can read. You edit them in the dashboard. |
| Products | `public.products` | Anyone can read rows where `published = true`. You edit them in the dashboard. |
| Accounts | Supabase Auth + `public.profiles` | Shoppers sign up with email + password or Google. A profile row (display name) is created automatically. Each member can read and edit only their own. |
| Reviews | `public.reviews` | Signed-in members only, one per piece. A review shows publicly once you set `approved = true`; until then only its author sees it, marked "awaiting approval". |
| Wishlists | `public.wishlist_items` | Guests keep theirs in the browser. When they sign in it merges into their account and syncs across devices. Members can read and change only their own rows. |
| Photos | Storage bucket `product-images` (public) | Anyone can view them. You upload them in the dashboard. |

The schema is in `supabase/migrations/`. `supabase/seed.sql` loads the starting catalog and is generated with `node supabase/export-seed.js > supabase/seed.sql`.

The site only uses the **publishable** key (`assets/js/config.js`), which is safe to make public because row-level security (RLS) controls what it can read and write. Never put the secret / service_role key in this repo.

### Everyday tasks in the Supabase dashboard
- **Change a price or text:** Table Editor → `products` → edit the row. The site picks up the change on the next page load.
- **Hide a product:** set `published` to false.
- **Add a product:** insert a row in `products`. Give it a `category_slug`, some `colors` (palette keys from `assets/js/data.js`, such as `rust`, `ink`, `gold-pearl`) and an `art` value such as `{"type":"jhumka"}`, or simply set `image_url`.
- **Add a product photo:** Storage → `product-images` → upload a transparent PNG/WebP. Then put its file name (for example `lotus-jhumka.png`) or its full URL in that product's `image_url`.
- **Approve a review:** Table Editor → `reviews` → set `approved` to true. Delete the row to reject it.

### Sign-in settings (Supabase dashboard → Authentication)
- **URL Configuration:** set the Site URL to `https://anayinjnani25.github.io/under-one-roof/account.html`. Add `https://anayinjnani25.github.io/under-one-roof/**` and `http://localhost:8737/**` to Redirect URLs. Confirmation emails, password resets and Google all return to these addresses.
- **Emails:** Supabase's built-in email sender is for testing only. It sends a handful of emails per hour, and only to members of your Supabase team. Before launch, connect your own SMTP service (Authentication → Emails → SMTP Settings), for example Resend, Brevo or Amazon SES.
- **Google:** create an OAuth client in Google Cloud. Use the type "Web application", with redirect URI `https://udgpsxfixpvededukhod.supabase.co/auth/v1/callback`. Then paste its Client ID and Secret into Authentication → Sign In / Providers → Google. The "Continue with Google" button appears on the account page by itself once that's switched on.
- Anonymous sign-ins are not used and can stay off.

### Fallbacks
- If Supabase can't be reached, the site renders the catalog bundled in `assets/js/data.js`.
- Guests' wishlists always work, stored in the browser.

## Logo
Replace `assets/logo/mark.svg`. The header, footer and favicon all point to this one file. The wordmark text is `WORDMARK` in `assets/js/common.js`.

## Not built yet
There is no checkout. "Add to bag" saves the piece to the wishlist and says checkout is coming soon.
