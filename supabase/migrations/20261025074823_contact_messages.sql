-- Applied to project udgpsxfixpvededukhod on 2026-10-25 (migration "contact_messages").
-- Contact form: anyone can send a message; nobody can read messages from the site.
-- Read and answer them in the Supabase dashboard (Table Editor → contact_messages).
create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  email      text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  topic      text not null default 'general' check (topic in ('general', 'order', 'custom', 'wholesale', 'other')),
  message    text not null check (char_length(btrim(message)) between 5 and 4000),
  user_id    uuid references auth.users(id) on delete set null default auth.uid(),
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

create policy "Anyone can send a contact message"
  on public.contact_messages for insert to anon, authenticated
  with check (handled = false and (user_id is null or user_id = (select auth.uid())));

-- no select / update / delete policies: messages are write-only from the site
revoke all on public.contact_messages from anon, authenticated;
grant insert (name, email, topic, message) on public.contact_messages to anon, authenticated;
