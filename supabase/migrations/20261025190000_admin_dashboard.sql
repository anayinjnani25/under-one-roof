-- Admin dashboard: admins, stock status, collections, orders, notifications.
-- Security-definer helpers live in the non-exposed `private` schema; the API only
-- sees thin security-invoker wrappers in `public`.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ---- admins -------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
create policy "Admins can see their own admin row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

insert into public.admins (user_id)
select id from auth.users where email = 'anayinjnani25@gmail.com'
on conflict do nothing;

-- ---- products: stock status + admin writes ---------------------------------
alter table public.products
  add column stock_status text not null default 'in_stock'
  check (stock_status in ('in_stock', 'made_to_order', 'sold_out'));

create policy "Admins read every product" on public.products for select to authenticated using ((select private.is_admin()));
create policy "Admins add products"    on public.products for insert to authenticated with check ((select private.is_admin()));
create policy "Admins edit products"   on public.products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete products" on public.products for delete to authenticated using ((select private.is_admin()));

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---- collections --------------------------------------------------------
create table public.collections (
  slug             text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  title            text not null check (char_length(btrim(title)) between 1 and 80),
  blurb            text not null default '' check (char_length(blurb) <= 400),
  i18n             jsonb not null default '{}'::jsonb,
  cover_product_id text references public.products(id) on delete set null on update cascade,
  published        boolean not null default false,
  show_banner      boolean not null default false,
  sort             int not null default 0,
  starts_at        timestamptz,
  ends_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index collections_cover_idx on public.collections (cover_product_id);
create table public.collection_products (
  collection_slug text not null references public.collections(slug) on delete cascade on update cascade,
  product_id      text not null references public.products(id) on delete cascade on update cascade,
  sort            int not null default 0,
  primary key (collection_slug, product_id)
);
create index collection_products_product_idx on public.collection_products (product_id);
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;

create policy "Live collections are public" on public.collections for select to anon, authenticated
  using ((published and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or (select private.is_admin()));
create policy "Admins add collections"    on public.collections for insert to authenticated with check ((select private.is_admin()));
create policy "Admins edit collections"   on public.collections for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete collections" on public.collections for delete to authenticated using ((select private.is_admin()));

create policy "Pieces in live collections are public" on public.collection_products for select to anon, authenticated
  using (exists (select 1 from public.collections c where c.slug = collection_slug
                 and ((c.published and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at > now())) or (select private.is_admin()))));
create policy "Admins add collection pieces"    on public.collection_products for insert to authenticated with check ((select private.is_admin()));
create policy "Admins edit collection pieces"   on public.collection_products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete collection pieces" on public.collection_products for delete to authenticated using ((select private.is_admin()));

create trigger collections_touch before update on public.collections
  for each row execute function public.touch_updated_at();

-- ---- orders -------------------------------------------------------------
create sequence public.order_no_seq start 1001;
create table public.orders (
  id          uuid primary key default gen_random_uuid(),
  order_no    text not null unique default ('UOR-' || nextval('public.order_no_seq')),
  idem_key    text not null unique check (char_length(idem_key) between 8 and 120),
  source      text not null check (source in ('wishlist', 'custom', 'price')),
  status      text not null default 'requested'
              check (status in ('requested', 'confirmed', 'in_making', 'shipped', 'delivered', 'cancelled')),
  user_id     uuid references auth.users(id) on delete set null,
  name        text check (name is null or char_length(name) <= 80),
  phone       text check (phone is null or char_length(phone) <= 30),
  notes       text check (notes is null or char_length(notes) <= 2000),
  details     jsonb not null default '{}'::jsonb,
  lang        text check (lang is null or lang in ('en', 'te', 'hi')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 4000),
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_user_idx on public.orders (user_id);

create table public.order_items (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null on update cascade,
  name_en    text not null,
  colour     text check (colour is null or char_length(colour) <= 40),
  qty        int not null check (qty between 1 and 20)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id       bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status   text not null,
  by_user  uuid references auth.users(id) on delete set null,
  at       timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, at);
create index order_events_user_idx on public.order_events (by_user);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
revoke all on public.orders, public.order_items, public.order_events from anon, authenticated;
grant select on public.orders, public.order_items, public.order_events to authenticated;
grant update (status, admin_notes) on public.orders to authenticated;

create policy "Admins read orders"   on public.orders for select to authenticated using ((select private.is_admin()));
create policy "Admins update orders" on public.orders for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins read order items"  on public.order_items for select to authenticated using ((select private.is_admin()));
create policy "Admins read order events" on public.order_events for select to authenticated using ((select private.is_admin()));

-- ---- notifications ----------------------------------------------------------
create table public.notifications (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('order', 'custom', 'price', 'review')),
  ref_id     text not null,
  title      text not null,
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  read_by    uuid references auth.users(id) on delete set null
);
create index notifications_unread_idx on public.notifications (created_at desc) where read_at is null;
create index notifications_read_by_idx on public.notifications (read_by);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at, read_by) on public.notifications to authenticated;
create policy "Admins read notifications"   on public.notifications for select to authenticated using ((select private.is_admin()));
create policy "Admins mark notifications"   on public.notifications for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
alter publication supabase_realtime add table public.notifications;

-- ---- admin access to existing tables -----------------------------------------
create policy "Admins read every profile" on public.profiles for select to authenticated using ((select private.is_admin()));
create policy "Admins read every review"  on public.reviews  for select to authenticated using ((select private.is_admin()));
create policy "Admins moderate reviews"   on public.reviews  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete reviews"     on public.reviews  for delete to authenticated using ((select private.is_admin()));
grant update (approved) on public.reviews to authenticated;

-- product photos: only admins write to the bucket (it stays publicly readable)
create policy "Admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select private.is_admin()));
create policy "Admins replace product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));
create policy "Admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));

-- ---- triggers: order log + notifications ---------------------------------------
create or replace function private.on_order_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.order_events (order_id, status, by_user) values (new.id, new.status, new.user_id);
  insert into public.notifications (kind, ref_id, title)
  values (case new.source when 'wishlist' then 'order' else new.source end, new.id::text,
          case new.source when 'wishlist' then 'New order ' when 'custom' then 'Custom request ' else 'Price question ' end
          || new.order_no || coalesce(' from ' || nullif(btrim(new.name), ''), ''));
  return new;
end $$;
create trigger orders_after_insert after insert on public.orders
  for each row execute function private.on_order_insert();

create or replace function private.on_order_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, status, by_user) values (new.id, new.status, (select auth.uid()));
  end if;
  return new;
end $$;
create trigger orders_before_update before update on public.orders
  for each row execute function private.on_order_update();

create or replace function private.on_review_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (kind, ref_id, title)
  values ('review', new.id::text, 'New review to approve from ' || new.name);
  return new;
end $$;
create trigger reviews_after_insert after insert on public.reviews
  for each row execute function private.on_review_insert();

revoke execute on function private.on_order_insert(), private.on_order_update(), private.on_review_insert() from public, anon, authenticated;

-- ---- placing an order (validated server-side, idempotent) ---------------------------
create or replace function private.place_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  k    text := p ->> 'key';
  src  text := p ->> 'source';
  it   jsonb;
  prod record;
  n    int := 0;
  bad  jsonb := '[]'::jsonb;
  new_id uuid;
  ono  text;
begin
  if k is null or char_length(k) not between 8 and 120 then
    raise exception 'invalid order key' using errcode = '22023';
  end if;
  if src is null or src not in ('wishlist', 'custom', 'price') then
    raise exception 'invalid order source' using errcode = '22023';
  end if;

  -- the same tap (double-click, retry, second tab) returns the order already made
  select o.order_no into ono from public.orders o where o.idem_key = k;
  if found then return jsonb_build_object('order_no', ono, 'duplicate', true); end if;

  if jsonb_typeof(coalesce(p -> 'items', '[]'::jsonb)) <> 'array' then
    raise exception 'items must be a list' using errcode = '22023';
  end if;
  for it in select value from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) loop
    n := n + 1;
    if n > 40 then raise exception 'too many items' using errcode = '22023'; end if;
    select pr.id, pr.published, pr.stock_status into prod from public.products pr where pr.id = it ->> 'id';
    if not found or not prod.published then
      bad := bad || jsonb_build_array(jsonb_build_object('id', it ->> 'id', 'reason', 'missing'));
    elsif prod.stock_status = 'sold_out' and src <> 'custom' then
      bad := bad || jsonb_build_array(jsonb_build_object('id', it ->> 'id', 'reason', 'sold_out'));
    elsif coalesce(it ->> 'qty', '') !~ '^[0-9]{1,2}$' or (it ->> 'qty')::int not between 1 and 20 then
      bad := bad || jsonb_build_array(jsonb_build_object('id', it ->> 'id', 'reason', 'qty'));
    end if;
  end loop;
  if src in ('wishlist', 'price') and n = 0 then
    return jsonb_build_object('error', 'empty');
  end if;
  if jsonb_array_length(bad) > 0 then
    return jsonb_build_object('error', 'invalid_items', 'items', bad);
  end if;
  if char_length(coalesce(p ->> 'details', '')) > 4000 then
    raise exception 'details too long' using errcode = '22023';
  end if;

  insert into public.orders (idem_key, source, user_id, name, phone, notes, details, lang)
  values (k, src, (select auth.uid()),
          nullif(left(btrim(coalesce(p ->> 'name', '')), 80), ''),
          nullif(left(btrim(coalesce(p ->> 'phone', '')), 30), ''),
          nullif(left(btrim(coalesce(p ->> 'notes', '')), 2000), ''),
          case when jsonb_typeof(p -> 'details') = 'object' then p -> 'details' else '{}'::jsonb end,
          case when p ->> 'lang' in ('en', 'te', 'hi') then p ->> 'lang' end)
  on conflict (idem_key) do nothing
  returning id, order_no into new_id, ono;

  if new_id is null then  -- lost a race with an identical request
    select o.order_no into ono from public.orders o where o.idem_key = k;
    return jsonb_build_object('order_no', ono, 'duplicate', true);
  end if;

  -- names are snapshotted from the catalog, never taken from the client
  insert into public.order_items (order_id, product_id, name_en, colour, qty)
  select new_id, pr.id, pr.name, nullif(left(it.value ->> 'colour', 40), ''), (it.value ->> 'qty')::int
  from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) it
  join public.products pr on pr.id = it.value ->> 'id';

  return jsonb_build_object('order_no', ono, 'duplicate', false);
end $$;
revoke execute on function private.place_order(jsonb) from public;
grant execute on function private.place_order(jsonb) to anon, authenticated;

create or replace function public.place_order(p jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.place_order(p);
$$;
revoke execute on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- ---- customers (admin only) -------------------------------------------------
create or replace function private.admin_customers()
returns table (id uuid, display_name text, email text, joined timestamptz, orders bigint, wishlist bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
  return query
    select u.id, p.display_name, u.email::text, u.created_at,
           (select count(*) from public.orders o where o.user_id = u.id),
           (select count(*) from public.wishlist_items w where w.user_id = u.id)
    from auth.users u left join public.profiles p on p.id = u.id
    where coalesce(u.is_anonymous, false) = false
    order by u.created_at desc;
end $$;
revoke execute on function private.admin_customers() from public, anon;
grant execute on function private.admin_customers() to authenticated;

create or replace function public.admin_customers()
returns table (id uuid, display_name text, email text, joined timestamptz, orders bigint, wishlist bigint)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_customers();
$$;
revoke execute on function public.admin_customers() from public, anon;
grant execute on function public.admin_customers() to authenticated;
