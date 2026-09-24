-- =====================================================================
-- Bean Bud — reactions: security policy checks
--
-- Run in the Supabase SQL editor, AFTER 20260928000100_reactions.sql. See rls_check.sql for
-- how this pattern works. Ends with ROLLBACK, so nothing it creates is kept.
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  cafe  uuid;
  visit uuid;
  n     int;
begin
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');
  insert into public.cafes (name, city, area, address, map_url)
  values ('Reaction Test Cafe', 'Testville', 'Nowhere', '1 Test Road', 'https://maps.example/t') returning id into cafe;
  insert into public.visits (user_id, cafe_id, visited_on) values (alice, cafe, '2026-09-02') returning id into visit;

  -- Bob reacts to Alice's log, once, and can switch it.
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.reactions (visit_id, kind) values (visit, 'love');
  raise notice 'PASS: you can react to someone else''s log';
  begin
    insert into public.reactions (visit_id, kind) values (visit, 'dislike');
    raise exception 'FAIL: a second reaction from the same person was accepted';
  exception when unique_violation then
    raise notice 'PASS: one reaction per person per log';
  end;
  update public.reactions set kind = 'question' where visit_id = visit;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: bob could not change his reaction'; end if;
  raise notice 'PASS: you can change your reaction';
  begin
    insert into public.reactions (visit_id, kind) values (visit, 'thumbsup');
    raise exception 'FAIL: an unknown reaction was accepted';
  exception when check_violation or unique_violation then
    raise notice 'PASS: only the three reactions are allowed';
  end;
  begin
    update public.reactions set user_id = alice where visit_id = visit;
    raise exception 'FAIL: a reaction was reassigned to someone else';
  exception when insufficient_privilege then
    raise notice 'PASS: a reaction cannot be handed to someone else';
  end;
  reset role;

  -- Alice can see Bob's reaction (that is how counts show) but cannot change or remove it.
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.reactions where visit_id = visit;
  if n <> 1 then raise exception 'FAIL: alice could not see the reaction on her log'; end if;
  raise notice 'PASS: everyone signed in can see reactions';
  update public.reactions set kind = 'dislike' where visit_id = visit;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: alice changed bob''s reaction'; end if;
  delete from public.reactions where visit_id = visit;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: alice removed bob''s reaction'; end if;
  raise notice 'PASS: nobody can change or remove your reaction but you';
  begin
    insert into public.reactions (user_id, visit_id, kind) values (bob, visit, 'love');
    raise exception 'FAIL: alice reacted as bob';
  exception when insufficient_privilege or unique_violation then
    raise notice 'PASS: you can only react as yourself';
  end;
  reset role;

  -- Bob can remove his own.
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.reactions where visit_id = visit;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: bob could not remove his own reaction'; end if;
  raise notice 'PASS: you can remove your own reaction';
  reset role;

  -- Logged out.
  set local role anon;
  begin
    perform 1 from public.reactions;
    raise exception 'FAIL: anon could read reactions';
  exception when insufficient_privilege then
    raise notice 'PASS: a logged-out visitor cannot read reactions';
  end;
  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
