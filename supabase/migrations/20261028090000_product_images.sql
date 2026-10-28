-- More pictures per piece. The product's own image_url stays picture 1 (the cover, also used
-- on cards everywhere); these rows are the extra pictures shown in the product page gallery.
create table public.product_images (
  id         bigint generated always as identity primary key,
  product_id text not null references public.products(id) on delete cascade on update cascade,
  image_url  text not null check (char_length(image_url) between 1 and 500),
  sort       int not null default 0,
  colour     text check (colour is null or char_length(colour) <= 40), -- optional: the palette key this picture shows
  alt        jsonb not null default '{}'::jsonb,                         -- {"en": "...", "te": "...", "hi": "..."}
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort);
alter table public.product_images enable row level security;

create policy "Pictures of published pieces are public" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.published) or (select private.is_admin()));
create policy "Admins add pictures"    on public.product_images for insert to authenticated with check ((select private.is_admin()));
create policy "Admins edit pictures"   on public.product_images for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete pictures" on public.product_images for delete to authenticated using ((select private.is_admin()));
