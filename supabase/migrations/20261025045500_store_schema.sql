-- Applied to project udgpsxfixpvededukhod (under-one-roof) on 2026-10-25.

-- Catalog -------------------------------------------------------------
create table public.categories (
  slug        text primary key,
  no          text not null,
  title       text not null,
  accent      text not null,
  blurb       text not null default '',
  care        text not null default '',
  feature_product_id text,
  sort        int  not null default 0
);

create table public.products (
  id            text primary key,
  category_slug text not null references public.categories(slug) on update cascade,
  name          text not null,
  mini          text not null,
  description   text not null default '',
  price         int  not null check (price >= 0),          -- whole rupees
  colors        text[] not null default '{}',               -- palette keys (see assets/js/data.js)
  art           jsonb not null default '{}'::jsonb,         -- illustrated fallback spec
  bg            text not null default '#EFE2C9',
  image_url     text,                                       -- transparent cut-out photo, optional
  sort          int  not null default 0,
  published     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index products_category_idx on public.products (category_slug, sort);

-- Reviews: anyone may submit, nothing shows until approved in the dashboard
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  rating      int  not null check (rating between 1 and 5),
  body        text not null check (char_length(btrim(body)) between 3 and 1000),
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id, created_at desc) where approved;

-- Wishlist: one row per (visitor, product); visitors are anonymous auth users
create table public.wishlist_items (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlist_product_idx on public.wishlist_items (product_id);

-- Row level security ---------------------------------------------------
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.reviews        enable row level security;
alter table public.wishlist_items enable row level security;

create policy "Catalog categories are public"
  on public.categories for select to anon, authenticated using (true);

create policy "Published products are public"
  on public.products for select to anon, authenticated using (published);

create policy "Approved reviews are public"
  on public.reviews for select to anon, authenticated using (approved);

create policy "Anyone can submit a review for moderation"
  on public.reviews for insert to anon, authenticated
  with check (approved = false);

create policy "Visitors read their own wishlist"
  on public.wishlist_items for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Visitors add to their own wishlist"
  on public.wishlist_items for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Visitors remove from their own wishlist"
  on public.wishlist_items for delete to authenticated
  using (user_id = (select auth.uid()));

-- Visitors can only touch these columns when submitting a review
revoke insert on public.reviews from anon, authenticated;
grant insert (product_id, name, rating, body) on public.reviews to anon, authenticated;

-- Product photos: public bucket, uploads only through the dashboard/service role
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/png','image/webp','image/jpeg','image/avif'])
on conflict (id) do nothing;
