-- Orders happen entirely on WhatsApp, so the site no longer records them.
-- Removes the orders tables, place_order, the email webhook and pg_net.
-- Notifications stay, for reviews awaiting approval only.
drop trigger if exists orders_notify on public.orders;
drop function if exists private.notify_new_order();
drop extension if exists pg_net;

drop function if exists public.place_order(jsonb);
drop function if exists private.place_order(jsonb);
drop table if exists public.order_events, public.order_items, public.orders;
drop function if exists private.on_order_insert(), private.on_order_update();
drop sequence if exists public.order_no_seq;

delete from public.notifications where kind <> 'review';
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind = 'review');

-- customers: no order count any more
drop function if exists public.admin_customers();
drop function if exists private.admin_customers();
create function private.admin_customers()
returns table (id uuid, display_name text, email text, joined timestamptz, wishlist bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
  return query
    select u.id, p.display_name, u.email::text, u.created_at,
           (select count(*) from public.wishlist_items w where w.user_id = u.id)
    from auth.users u left join public.profiles p on p.id = u.id
    where coalesce(u.is_anonymous, false) = false
    order by u.created_at desc;
end $$;
revoke execute on function private.admin_customers() from public, anon;
grant execute on function private.admin_customers() to authenticated;

create function public.admin_customers()
returns table (id uuid, display_name text, email text, joined timestamptz, wishlist bigint)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_customers();
$$;
revoke execute on function public.admin_customers() from public, anon;
grant execute on function public.admin_customers() to authenticated;
