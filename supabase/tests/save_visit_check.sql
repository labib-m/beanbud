-- =====================================================================
-- Bean Bud — save_visit() checks
--
-- Run in the Supabase SQL editor AFTER 20260919000100_save_visit.sql.
-- Same idea as rls_check.sql: two pretend users, a series of checks, then
-- ROLLBACK so nothing is kept. Last line returns "ALL CHECKS PASSED";
-- a failure stops the script with an error starting "FAIL:".
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  v1 uuid; v2 uuid; v3 uuid;
  n int;
  cafe jsonb := '{"name":"Save Test Cafe","city":"Dhaka","area":"Banani","address":"1 Test Road","map_url":"https://maps.example/t"}';
begin
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');

  ---------------- alice saves a new visit ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;

  v1 := public.save_visit(
    cafe,
    '{"visited_on":"2026-09-10","score_ambiance":4,"score_food":5,"good_for":["Friends"],"amenities":["Wi-Fi"],"currency":"BDT"}',
    '[{"drink_type":"Flat white","price":300,"score":4},{"drink_type":"Cortado","price":280,"score":null}]',
    'alice private note');

  select count(*) into n from public.visit_drinks where visit_id = v1;
  if n <> 2 then raise exception 'FAIL: expected 2 drinks, got %', n; end if;
  select count(*) into n from public.visit_notes where visit_id = v1 and notes = 'alice private note';
  if n <> 1 then raise exception 'FAIL: note not saved'; end if;
  select count(*) into n from public.visits where id = v1 and user_id = alice and overall = 4.5
     and good_for = '{Friends}' and currency = 'BDT';
  if n <> 1 then raise exception 'FAIL: visit row is wrong'; end if;
  select count(*) into n from public.cafes where name = 'Save Test Cafe' and created_by = alice;
  if n <> 1 then raise exception 'FAIL: cafe not created by alice'; end if;
  raise notice 'PASS: new visit saves cafe, visit, 2 drinks and note together';

  ---------------- alice edits it ----------------
  perform public.save_visit(
    cafe,
    '{"visited_on":"2026-09-10","score_ambiance":2}',
    '[{"drink_type":"Latte","price":250}]',
    '',
    v1);
  select count(*) into n from public.visit_drinks where visit_id = v1 and drink_type = 'Latte';
  if n <> 1 then raise exception 'FAIL: drinks were not replaced'; end if;
  select count(*) into n from public.visit_drinks where visit_id = v1;
  if n <> 1 then raise exception 'FAIL: old drinks still there (got %)', n; end if;
  select count(*) into n from public.visit_notes where visit_id = v1;
  if n <> 0 then raise exception 'FAIL: blank note should remove the note'; end if;
  raise notice 'PASS: editing replaces drinks and a blank note removes the note';

  ---------------- bob logs at the SAME cafe ----------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- different capitalisation and spacing must still match alice's cafe
  v2 := public.save_visit('{"name":"  save TEST   cafe","city":"dhaka","area":"BANANI"}',
                          '{"visited_on":"2026-09-11"}');
  select count(*) into n from public.cafes where cafe_key = 'save test cafe|dhaka|banani';
  if n <> 1 then raise exception 'FAIL: duplicate cafe created (got %)', n; end if;
  select count(*) into n from public.visits
    where id in (v1, v2) and cafe_id = (select id from public.cafes where cafe_key = 'save test cafe|dhaka|banani');
  if n <> 2 then raise exception 'FAIL: both visits should share one cafe'; end if;
  raise notice 'PASS: bob''s visit reuses alice''s cafe (case and spacing ignored)';

  ---------------- bob cannot edit alice's visit through it ----------------
  begin
    perform public.save_visit(cafe, '{"visited_on":"2026-09-12"}', '[]', 'bob note', v1);
    raise exception 'FAIL: bob edited alice''s visit via save_visit';
  exception when insufficient_privilege then
    raise notice 'PASS: bob cannot edit alice''s visit through save_visit (loud error)';
  end;

  ---------------- a bad save leaves nothing behind ----------------
  begin
    v3 := public.save_visit('{"name":"Half Saved Cafe","city":"Dhaka","address":"2 Test Road","map_url":"https://maps.example/h"}',
                            '{"visited_on":"2026-09-13"}',
                            '[{"drink_type":"Mocha","score":9}]');   -- score 9 is invalid
    raise exception 'FAIL: invalid drink score was accepted';
  exception when check_violation then
    null;
  end;
  select count(*) into n from public.cafes where name = 'Half Saved Cafe';
  if n <> 0 then raise exception 'FAIL: failed save left a cafe behind'; end if;
  raise notice 'PASS: a failed save is all-or-nothing (no half-saved cafe)';

  ---------------- logged-out users cannot call it ----------------
  reset role;
  set local role anon;
  begin
    perform public.save_visit(cafe, '{"visited_on":"2026-09-10"}');
    raise exception 'FAIL: anon called save_visit';
  exception when insufficient_privilege then
    raise notice 'PASS: logged-out visitors cannot call save_visit';
  end;
  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
