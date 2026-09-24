-- =====================================================================
-- Bean Bud — support messages: security policy checks
--
-- Run in the Supabase SQL editor of a SCRATCH project (not your real one), AFTER
-- 20260925000200_announcements.sql and 20260926000100_support_messages.sql. See
-- rls_check.sql for how this pattern works. Ends with ROLLBACK, so nothing is kept.
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  msg   uuid;
  n     int;
begin
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');
  update public.profiles set is_admin = true where id = alice;

  -- Bob (a normal user) can send a message as himself...
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- (No RETURNING here: reading the new row back needs the admin-only select policy, which is
  -- why the app inserts without asking for the row back.)
  insert into public.support_messages (body) values ('The map link on Barock is wrong');
  raise notice 'PASS: a normal user can send a message';

  -- ...but not as someone else, and not an empty one.
  begin
    insert into public.support_messages (user_id, body) values (alice, 'Forged');
    raise exception 'FAIL: bob sent a message as alice';
  exception when insufficient_privilege then
    raise notice 'PASS: a message can only be sent as yourself';
  end;
  begin
    insert into public.support_messages (body) values ('   ');
    raise exception 'FAIL: a blank message was accepted';
  exception when check_violation then
    raise notice 'PASS: a blank message is rejected';
  end;

  -- ...and cannot read or delete any (not even his own).
  select count(*) into n from public.support_messages;
  if n <> 0 then raise exception 'FAIL: a normal user could read support messages'; end if;
  raise notice 'PASS: a normal user cannot read support messages';
  delete from public.support_messages where id = msg;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a normal user deleted a support message'; end if;
  raise notice 'PASS: a normal user cannot delete support messages';
  reset role;
  select id into msg from public.support_messages where user_id = bob;

  -- Alice (admin) can read and delete.
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.support_messages where id = msg;
  if n <> 1 then raise exception 'FAIL: the admin could not read a support message'; end if;
  raise notice 'PASS: the admin can read support messages';
  delete from public.support_messages where id = msg;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the admin could not delete a support message'; end if;
  raise notice 'PASS: the admin can delete support messages';
  reset role;

  -- Logged out.
  set local role anon;
  begin
    perform 1 from public.support_messages;
    raise exception 'FAIL: anon could read support messages';
  exception when insufficient_privilege then
    raise notice 'PASS: a logged-out visitor cannot read support messages';
  end;
  begin
    insert into public.support_messages (body) values ('spam');
    raise exception 'FAIL: anon could send a support message';
  exception when insufficient_privilege then
    raise notice 'PASS: a logged-out visitor cannot send support messages';
  end;
  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
