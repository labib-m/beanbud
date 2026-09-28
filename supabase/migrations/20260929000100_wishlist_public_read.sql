-- =====================================================================
-- Bean Bud — wishlist becomes readable by everyone signed in, so it can show on a
-- person's public profile, not just your own. Adding, changing and removing a
-- bookmark stays private to its owner (unchanged from 20260927000100_wishlist.sql).
-- Safe to run once, in the Supabase SQL editor.
-- =====================================================================
begin;

drop policy "wishlist: you can read only your own" on public.wishlist;

create policy "wishlist: everyone signed in can read"
  on public.wishlist for select to authenticated
  using (true);

commit;
