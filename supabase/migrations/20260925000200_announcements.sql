-- =====================================================================
-- Bean Bud — developer announcements (an "RSS-style" feed only the developer can post to)
--
--   * Everyone signed in can read every announcement.
--   * Only an admin (profiles.is_admin) can post or delete one. There's no in-between role:
--     this is you, the developer, telling everyone about a new feature — not a discussion.
--   * is_admin is a plain column, but no signed-in user can change it themselves: the blanket
--     "update your own profile" grant from the initial schema would otherwise let anyone flip
--     it on, so the UPDATE privilege on just this one column is revoked from clients. It can
--     only ever be set from the SQL editor, by you.
-- =====================================================================
begin;

alter table public.profiles add column is_admin boolean not null default false;

-- The existing "grant update on public.profiles to authenticated" is table-wide (every column);
-- this narrows it back down so is_admin is excluded, while every other field stays editable.
revoke update (is_admin) on public.profiles from authenticated;

-- Make yourself the admin. Change 'labib' here (or run it again for someone else) if that
-- username is ever wrong for your account.
update public.profiles set is_admin = true where lower(handle) = 'labib';


create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(btrim(title)) between 1 and 80),
  body       text check (body is null or char_length(body) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index announcements_created_at_idx on public.announcements (created_at desc);

alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;
grant select, insert, delete on public.announcements to authenticated;

create policy "announcements: signed-in users can read all"
  on public.announcements for select to authenticated
  using (true);

create policy "announcements: only an admin can post, and only as themselves"
  on public.announcements for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin)
  );

create policy "announcements: only an admin can delete"
  on public.announcements for delete to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

commit;
