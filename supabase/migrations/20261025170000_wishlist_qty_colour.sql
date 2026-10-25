-- Wishlist items remember how many and which colour, for WhatsApp orders.
alter table public.wishlist_items
  add column qty int not null default 1 check (qty between 1 and 20),
  add column colour text check (colour is null or char_length(colour) <= 40);

create policy "Members update their own wishlist"
  on public.wishlist_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- members may change only quantity and colour on their rows
revoke update on public.wishlist_items from anon, authenticated;
grant update (qty, colour) on public.wishlist_items to authenticated;
