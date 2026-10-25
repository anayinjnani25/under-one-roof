-- How many wishlists and reviews a product is in, for the admin's "delete permanently" warning.
create or replace function private.product_usage(pid text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'wishlists', (select count(*) from public.wishlist_items w where w.product_id = pid),
    'reviews',   (select count(*) from public.reviews r where r.product_id = pid),
    'collections', (select count(*) from public.collection_products c where c.product_id = pid));
end $$;
revoke execute on function private.product_usage(text) from public, anon;
grant execute on function private.product_usage(text) to authenticated;

create or replace function public.product_usage(pid text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.product_usage(pid);
$$;
revoke execute on function public.product_usage(text) from public, anon;
grant execute on function public.product_usage(text) to authenticated;
