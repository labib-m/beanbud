-- =====================================================================
-- Bean Bud — developer announcements: security policy checks
--
-- Run in the Supabase SQL editor of a SCRATCH project (not your real one), AFTER
-- 20260925000200_announcements.sql. See rls_check.sql for how this pattern works.
-- Ends with ROLLBACK, so nothing it creates is kept.
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  post  uuid;
  n     int;
begin
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');

  ------------------------------------------------------------------
  -- Nobody starts as an admin, and nobody can make themselves one.
  ------------------------------------------------------------------
  select count(*) into n from public.profiles where id in (alice, bob) and is_admin;
  if n <> 0 then raise exception 'FAIL: a brand-new account started as an admin'; end if;
  raise notice 'PASS: new accounts are not admins';

  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.profiles set is_admin = true where id = bob;
    raise exception 'FAIL: bob made himself an admin';
  exception when insufficient_privilege then
    raise notice 'PASS: nobody can change their own is_admin';
  end;

  ------------------------------------------------------------------
  -- Bob (not an admin) cannot post.
  ------------------------------------------------------------------
  begin
    insert into public.announcements (title) values ('Fake update from bob');
    raise exception 'FAIL: a non-admin (bob) was able to post an announcement';
  exception when insufficient_privilege then
    raise notice 'PASS: a non-admin cannot post an announcement';
  end;
  reset role;

  ------------------------------------------------------------------
  -- Make alice the admin (only ever done from the SQL editor, by the developer).
  ------------------------------------------------------------------
  update public.profiles set is_admin = true where id = alice;

  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.announcements (title, body) values ('New: push notifications', 'Turn them on from You.') returning id into post;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: alice (an admin) could not post an announcement'; end if;
  raise notice 'PASS: an admin can post an announcement';

  -- Alice cannot post it in someone else's name.
  begin
    insert into public.announcements (title, created_by) values ('Forged', bob);
    raise exception 'FAIL: alice posted an announcement attributed to bob';
  exception when insufficient_privilege then
    raise notice 'PASS: an announcement can only be posted as yourself';
  end;
  reset role;

  ------------------------------------------------------------------
  -- Bob (still not an admin) can read it, but not delete it.
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.announcements where id = post;
  if n <> 1 then raise exception 'FAIL: bob (a normal user) could not read alice''s announcement'; end if;
  raise notice 'PASS: everyone signed in can read announcements';

  begin
    delete from public.announcements where id = post;
    raise exception 'FAIL: bob (not an admin) was able to delete an announcement';
  exception when insufficient_privilege then
    raise notice 'PASS: a non-admin cannot delete an announcement';
  end;
  reset role;

  ------------------------------------------------------------------
  -- Alice (the admin) can delete it.
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.announcements where id = post;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: alice (an admin) could not delete her own announcement'; end if;
  raise notice 'PASS: an admin can delete an announcement';
  reset role;

  ------------------------------------------------------------------
  -- Logged out.
  ------------------------------------------------------------------
  set local role anon;
  begin
    perform 1 from public.announcements;
    raise exception 'FAIL: anon was able to read announcements';
  exception when insufficient_privilege then
    raise notice 'PASS: logged-out visitor cannot read announcements';
  end;
  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
