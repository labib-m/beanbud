-- =====================================================================
-- Bean Bud — cafe wishlist: bookmark a cafe you want to try. Private to each person:
-- you can only see, add and remove your own bookmarks. Safe to run once, in the
-- Supabase SQL editor.
-- =====================================================================
begin;

create table public.wishlist (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  cafe_id    uuid not null references public.cafes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cafe_id)
);
create index wishlist_user_created_idx on public.wishlist (user_id, created_at desc);

alter table public.wishlist enable row level security;
revoke all on public.wishlist from anon, authenticated;
grant select, insert, delete on public.wishlist to authenticated;

create policy "wishlist: you can read only your own"
  on public.wishlist for select to authenticated
  using (user_id = (select auth.uid()));

create policy "wishlist: you can add only for yourself"
  on public.wishlist for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "wishlist: you can remove only your own"
  on public.wishlist for delete to authenticated
  using (user_id = (select auth.uid()));

commit;
