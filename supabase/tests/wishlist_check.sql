-- =====================================================================
-- Bean Bud — wishlist: security policy checks
--
-- Run in the Supabase SQL editor, AFTER 20260927000100_wishlist.sql. See rls_check.sql for
-- how this pattern works. Ends with ROLLBACK, so nothing it creates is kept.
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  cafe  uuid;
  n     int;
begin
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');
  insert into public.cafes (name, city, area, address, map_url)
  values ('Wishlist Test Cafe', 'Testville', 'Nowhere', '1 Test Road', 'https://maps.example/t') returning id into cafe;

  -- Bob can bookmark a cafe, once.
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.wishlist (cafe_id) values (cafe);
  raise notice 'PASS: you can bookmark a cafe';
  begin
    insert into public.wishlist (cafe_id) values (cafe);
    raise exception 'FAIL: the same cafe was bookmarked twice';
  exception when unique_violation then
    raise notice 'PASS: a cafe can only be bookmarked once';
  end;

  -- ...but not on someone else's behalf.
  begin
    insert into public.wishlist (user_id, cafe_id) values (alice, cafe);
    raise exception 'FAIL: bob bookmarked a cafe for alice';
  exception when insufficient_privilege then
    raise notice 'PASS: you can only bookmark for yourself';
  end;
  reset role;

  -- Alice cannot see or remove Bob's bookmark.
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.wishlist;
  if n <> 0 then raise exception 'FAIL: alice could see bob''s wishlist'; end if;
  raise notice 'PASS: nobody else can see your wishlist';
  delete from public.wishlist where cafe_id = cafe;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: alice removed bob''s bookmark'; end if;
  raise notice 'PASS: nobody else can remove your bookmarks';
  reset role;

  -- Bob can see and remove his own.
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.wishlist;
  if n <> 1 then raise exception 'FAIL: bob could not see his own bookmark'; end if;
  delete from public.wishlist where cafe_id = cafe;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: bob could not remove his own bookmark'; end if;
  raise notice 'PASS: you can see and remove your own bookmarks';
  reset role;

  -- Logged out.
  set local role anon;
  begin
    perform 1 from public.wishlist;
    raise exception 'FAIL: anon could read wishlists';
  exception when insufficient_privilege then
    raise notice 'PASS: a logged-out visitor cannot read wishlists';
  end;
  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
