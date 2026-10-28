-- Admin invites by email. An invited person becomes an admin the first time they sign in
-- with Google using that address (Google has verified they own it). Email-and-password
-- sign-ups never qualify, so typing someone else's address into the sign-up form gets nothing.
-- Invites live in the private schema, which the website's API can't read or change.
create table private.admin_invites (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
revoke all on private.admin_invites from public, anon, authenticated;

create or replace function private.grant_invited_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  addr text := lower(new.identity_data->>'email');
begin
  if new.provider = 'google'
     and coalesce((new.identity_data->>'email_verified')::boolean, false)
     and exists (select 1 from private.admin_invites i where i.email = addr) then
    insert into public.admins (user_id) values (new.user_id) on conflict do nothing;
    delete from private.admin_invites where email = addr;
  end if;
  return new;
end;
$$;
revoke all on function private.grant_invited_admin() from public, anon, authenticated;

create trigger grant_invited_admin
  after insert on auth.identities
  for each row execute function private.grant_invited_admin();

-- Mitali S Rao (2026-10-28)
insert into private.admin_invites (email) values ('mitali.rao@gmail.com');

-- She had already signed in with Google as mitali.rao27@gmail.com, so that account was made
-- admin directly (2026-10-28) and the unused invite removed.
insert into public.admins (user_id)
  select u.id from auth.users u join auth.identities i on i.user_id = u.id and i.provider = 'google'
  where lower(u.email) = 'mitali.rao27@gmail.com'
  on conflict do nothing;
delete from private.admin_invites where email = 'mitali.rao@gmail.com';
