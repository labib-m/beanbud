-- =====================================================================
-- Bean Bud — support messages: anyone signed in can send the developer a message
-- (bug report, feature request, feedback); only an admin (is_admin, see
-- 20260925000200_announcements.sql) can read or delete them. Sending is only ever
-- as yourself. Safe to run once, in the Supabase SQL editor.
-- =====================================================================
begin;

create table public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid() references public.profiles (id) on delete set null,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index support_messages_created_at_idx on public.support_messages (created_at desc);

alter table public.support_messages enable row level security;
revoke all on public.support_messages from anon, authenticated;
grant select, insert, delete on public.support_messages to authenticated;

create policy "support: anyone signed in can send, only as themselves"
  on public.support_messages for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "support: only an admin can read"
  on public.support_messages for select to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

create policy "support: only an admin can delete"
  on public.support_messages for delete to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

commit;
