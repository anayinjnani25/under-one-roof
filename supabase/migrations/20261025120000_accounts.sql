-- Shopper accounts: profiles, account-owned reviews, member-only wishlists.

-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Members read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Members update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A profile row for every new account (name from Google, sign-up form, or email)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(nullif(btrim(coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )), ''), 60)
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reviews belong to signed-in (non-anonymous) members -----------------------
alter table public.reviews
  add column user_id uuid references auth.users(id) on delete set null default auth.uid();
create unique index reviews_one_per_member on public.reviews (product_id, user_id);
create index reviews_user_idx on public.reviews (user_id);

drop policy "Anyone can submit a review for moderation" on public.reviews;

create policy "Members submit reviews for moderation"
  on public.reviews for insert to authenticated
  with check (
    approved = false
    and user_id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  );

create policy "Members see their own reviews, approved or not"
  on public.reviews for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert on public.reviews from anon, authenticated;
grant insert (product_id, name, rating, body) on public.reviews to authenticated;

-- Wishlists: members only (guests keep theirs in the browser) ---------------
drop policy "Visitors read their own wishlist" on public.wishlist_items;
drop policy "Visitors add to their own wishlist" on public.wishlist_items;
drop policy "Visitors remove from their own wishlist" on public.wishlist_items;

create policy "Members read their own wishlist"
  on public.wishlist_items for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members add to their own wishlist"
  on public.wishlist_items for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members remove from their own wishlist"
  on public.wishlist_items for delete to authenticated
  using (user_id = (select auth.uid()));
