-- =====================================================================
-- Bean Bud — confirmed updates to an existing cafe from the visit form
--
-- Run in the Supabase SQL editor AFTER 20260920000400_save_visit_update_details.sql.
-- Ends with ROLLBACK (nothing is kept); the last line returns ALL CHECKS PASSED.
-- A failing check stops the script with an error starting "FAIL:".
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  cafe uuid; v0 uuid; v1 uuid; v2 uuid; v3 uuid; v4 uuid;
  n int; a text; m text; who uuid; pa text; k text;
begin
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');

  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- a cafe to work with
  v0 := public.save_visit('{"name":"Update Cafe","city":"Dhaka","area":"Banani","address":"1 Original Road","map_url":"https://maps.example/orig"}',
                          '{"visited_on":"2026-09-01"}');
  select id into cafe from public.cafes where name = 'Update Cafe';
  select count(*) into n from public.cafe_revisions where cafe_id = cafe;
  if n <> 1 then raise exception 'FAIL: setup: expected 1 history entry, got %', n; end if;

  ------------------------------------------------------------------
  -- 1. Without confirmation, a visit changes nothing about the cafe (even if it carries a different address)
  ------------------------------------------------------------------
  perform public.save_visit('{"name":"Update Cafe","city":"Dhaka","area":"Banani","address":"UNCONFIRMED","map_url":"https://maps.example/unconfirmed"}',
                            '{"visited_on":"2026-09-02"}');
  perform public.save_visit('{"name":"Update Cafe","city":"Dhaka","area":"Banani","address":"UNCONFIRMED","map_url":"https://maps.example/unconfirmed","update_details":false}',
                            '{"visited_on":"2026-09-03"}');
  select address, map_url into a, m from public.cafes where id = cafe;
  if a <> '1 Original Road' or m <> 'https://maps.example/orig' then raise exception 'FAIL: an unconfirmed visit changed the cafe (% / %)', a, m; end if;
  select count(*) into n from public.cafe_revisions where cafe_id = cafe;
  if n <> 1 then raise exception 'FAIL: an unconfirmed visit added a history entry'; end if;
  select count(*) into n from public.visits where cafe_id = cafe and user_id = alice;
  if n <> 3 then raise exception 'FAIL: the unconfirmed visits should still have been saved (got %)', n; end if;
  raise notice 'PASS: without confirmation the visit saves and the cafe is untouched';

  ------------------------------------------------------------------
  -- 2. Confirmed: the cafe updates, it is recorded under the caller's name, and THIS visit uses the new version
  ------------------------------------------------------------------
  v1 := public.save_visit('{"name":"Update Cafe","city":"Dhaka","area":"Banani","address":"2 Corrected Road","map_url":"https://maps.example/new","update_details":true}',
                          '{"visited_on":"2026-09-04"}');
  select address, map_url into a, m from public.cafes where id = cafe;
  if a <> '2 Corrected Road' or m <> 'https://maps.example/new' then raise exception 'FAIL: the confirmed update did not apply (% / %)', a, m; end if;
  select kind, prev_address, address, changed_by into k, pa, a, who from public.cafe_revisions where cafe_id = cafe and kind = 'edited';
  if pa <> '1 Original Road' or a <> '2 Corrected Road' or who <> alice then
    raise exception 'FAIL: the update was not recorded properly (% -> % by %)', pa, a, who; end if;
  select count(*) into n from public.visits v join public.cafe_revisions r on r.id = v.cafe_revision_id
   where v.id = v1 and r.address = '2 Corrected Road';
  if n <> 1 then raise exception 'FAIL: the visit that made the correction should be logged under the updated version'; end if;
  select count(*) into n from public.visits v join public.cafe_revisions r on r.id = v.cafe_revision_id
   where v.id = v0 and r.address = '1 Original Road';
  if n <> 1 then raise exception 'FAIL: an earlier visit lost its version'; end if;
  raise notice 'PASS: a confirmed update applies, is recorded with old and new value and who, and earlier visits keep their version';

  ------------------------------------------------------------------
  -- 3. Blank boxes never erase what is saved; a real change in the other box still applies
  ------------------------------------------------------------------
  perform public.save_visit('{"name":"Update Cafe","city":"Dhaka","area":"Banani","address":"","map_url":"https://maps.example/third","update_details":true}',
                            '{"visited_on":"2026-09-05"}');
  select address, map_url into a, m from public.cafes where id = cafe;
  if a <> '2 Corrected Road' then raise exception 'FAIL: a blank address erased the saved one (got %)', a; end if;
  if m <> 'https://maps.example/third' then raise exception 'FAIL: the map link change should still apply (got %)', m; end if;

  select count(*) into n from public.cafe_revisions where cafe_id = cafe;
  v2 := public.save_visit('{"name":"Update Cafe","city":"Dhaka","area":"Banani","address":"   ","map_url":"","update_details":true}',
                          '{"visited_on":"2026-09-06"}');
  select address, map_url into a, m from public.cafes where id = cafe;
  if a <> '2 Corrected Road' or m <> 'https://maps.example/third' then raise exception 'FAIL: blank boxes changed the cafe'; end if;
  if (select count(*) from public.cafe_revisions where cafe_id = cafe) <> n then raise exception 'FAIL: blank boxes added a history entry'; end if;
  select count(*) into n from public.visits where id = v2;
  if n <> 1 then raise exception 'FAIL: a visit with blank boxes must still be saved'; end if;
  raise notice 'PASS: blank boxes never erase the saved values, and the visit still saves';

  ------------------------------------------------------------------
  -- 4. Confirming with values identical to what is saved adds nothing to the history
  ------------------------------------------------------------------
  select count(*) into n from public.cafe_revisions where cafe_id = cafe;
  perform public.save_visit('{"name":"Update Cafe","city":"Dhaka","area":"Banani","address":"2 Corrected Road","map_url":"https://maps.example/third","update_details":true}',
                            '{"visited_on":"2026-09-07"}');
  if (select count(*) from public.cafe_revisions where cafe_id = cafe) <> n then raise exception 'FAIL: an identical "update" added a history entry'; end if;
  raise notice 'PASS: confirming identical values adds nothing to the history';

  ------------------------------------------------------------------
  -- 5. A bad map link refuses the WHOLE save (nothing half-done)
  ------------------------------------------------------------------
  select count(*) into n from public.visits where cafe_id = cafe;
  begin
    perform public.save_visit('{"name":"Update Cafe","city":"Dhaka","area":"Banani","address":"3 Road","map_url":"not a link","update_details":true}',
                              '{"visited_on":"2026-09-08"}');
    raise exception 'FAIL: a bad map link was accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.visits where cafe_id = cafe) <> n then raise exception 'FAIL: a refused update still saved a visit'; end if;
  select address into a from public.cafes where id = cafe;
  if a <> '2 Corrected Road' then raise exception 'FAIL: a refused update still changed the address'; end if;
  raise notice 'PASS: a bad map link refuses the whole save and changes nothing';

  ------------------------------------------------------------------
  -- 6. Anyone signed in can confirm a correction (everyone may edit a cafe), under their own name
  ------------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v3 := public.save_visit('{"name":"update  CAFE","city":"dhaka","area":"BANANI","address":"4 Bob Street","map_url":"https://maps.example/bob","update_details":true}',
                          '{"visited_on":"2026-09-09"}');
  select address into a from public.cafes where id = cafe;
  if a <> '4 Bob Street' then raise exception 'FAIL: bob''s confirmed correction did not apply (got %)', a; end if;
  select count(*) into n from public.cafe_revisions where cafe_id = cafe and kind = 'edited' and changed_by = bob and address = '4 Bob Street';
  if n <> 1 then raise exception 'FAIL: bob''s correction is not in the history under his name'; end if;
  select count(*) into n from public.cafes where lower(name) = 'update cafe';
  if n <> 1 then raise exception 'FAIL: the cafe typed differently was duplicated'; end if;
  raise notice 'PASS: another signed-in person can confirm a correction, recorded under their own name';

  ------------------------------------------------------------------
  -- 7. A NEW cafe still needs its address and map link, and "update_details" changes nothing there
  ------------------------------------------------------------------
  begin
    perform public.save_visit('{"name":"Brand New","city":"Dhaka","area":"Banani","update_details":true}', '{"visited_on":"2026-09-10"}');
    raise exception 'FAIL: a new cafe was created without details';
  exception when invalid_parameter_value then null; end;
  v4 := public.save_visit('{"name":"Brand New","city":"Dhaka","area":"Banani","address":"5 New Road","map_url":"https://maps.example/bn","update_details":true}',
                          '{"visited_on":"2026-09-10"}');
  select count(*) into n from public.cafe_revisions r join public.cafes c on c.id = r.cafe_id where c.name = 'Brand New';
  if n <> 1 then raise exception 'FAIL: creating a cafe should make exactly one history entry (got %)', n; end if;
  raise notice 'PASS: a new cafe still needs its details and gets a single "created" history entry';

  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
