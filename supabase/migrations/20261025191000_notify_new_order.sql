-- Database webhook: every new order calls the notify-new-order Edge Function once.
-- The function itself refuses to email the same order twice (orders.notified_at).
create extension if not exists pg_net with schema extensions;

create or replace function private.notify_new_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url     := 'https://udgpsxfixpvededukhod.supabase.co/functions/v1/notify-new-order',
    body    := jsonb_build_object('order_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000);
  return new;
end $$;
revoke execute on function private.notify_new_order() from public, anon, authenticated;

create trigger orders_notify after insert on public.orders
  for each row execute function private.notify_new_order();
