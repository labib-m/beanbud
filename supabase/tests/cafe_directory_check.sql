-- =====================================================================
-- Bean Bud — cafe directory, cafe codes, page history and public notes checks
--
-- Run in the Supabase SQL editor AFTER 20260920000300_cafe_directory.sql.
-- Two pretend users (alice, bob) try things each should and should not be allowed to do.
-- Ends with ROLLBACK (nothing is kept); the last line returns ALL CHECKS PASSED.
-- A failing check stops the script with an error starting "FAIL:".
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  cafe uuid; cafe2 uuid;
  v_alice uuid; v_bob uuid; v_pub uuid;
  rev_created uuid;
  n int; t text; who uuid; k text; pa text; a text;
begin
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');

  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;

  ------------------------------------------------------------------
  -- 1. A NEW cafe needs an address AND a map link (it goes straight into the directory)
  ------------------------------------------------------------------
  begin
    perform public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Banani"}', '{"visited_on":"2026-09-01"}');
    raise exception 'FAIL: a new cafe was created with no address and no map link';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Banani","address":"1 Original Road"}', '{"visited_on":"2026-09-01"}');
    raise exception 'FAIL: a new cafe was created with no map link';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Banani","address":"   ","map_url":"https://maps.example/o"}', '{"visited_on":"2026-09-01"}');
    raise exception 'FAIL: a new cafe was created with a blank address';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Banani","address":"1 Original Road","map_url":"not a link"}', '{"visited_on":"2026-09-01"}');
    raise exception 'FAIL: a new cafe was created with a map link that is not a link';
  exception when check_violation then null; end;
  select count(*) into n from public.cafes where name = 'Dose Espresso';
  if n <> 0 then raise exception 'FAIL: a refused save left a cafe behind'; end if;
  raise notice 'PASS: a new cafe needs a real address and a real map link, and a refusal leaves nothing behind';

  ------------------------------------------------------------------
  -- 2. A valid new cafe: history entry, code, and the visit remembers that version
  ------------------------------------------------------------------
  v_alice := public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Banani","address":"1 Original Road","map_url":"https://maps.example/orig"}',
                               '{"visited_on":"2026-09-01"}');
  select id, code into cafe, t from public.cafes where name = 'Dose Espresso';
  if t <> 'DOSE_DHA_BAN' then raise exception 'FAIL: cafe code should be DOSE_DHA_BAN, got %', t; end if;
  select id, kind, address, changed_by into rev_created, k, a, who from public.cafe_revisions where cafe_id = cafe;
  if k <> 'created' or a <> '1 Original Road' or who <> alice then
    raise exception 'FAIL: first history entry wrong (kind %, address %, by %)', k, a, who; end if;
  select count(*) into n from public.visits where id = v_alice and cafe_revision_id = rev_created;
  if n <> 1 then raise exception 'FAIL: the visit should remember the cafe version it was logged under'; end if;
  raise notice 'PASS: a new cafe gets code DOSE_DHA_BAN, a "created" history entry, and the visit remembers that version';

  ------------------------------------------------------------------
  -- 3. Codes are unique and predictable
  ------------------------------------------------------------------
  perform public.save_visit('{"name":"Dose Coffee","city":"Dhaka","area":"Banani","address":"2 Road","map_url":"https://maps.example/2"}', '{"visited_on":"2026-09-02"}');
  select code into t from public.cafes where name = 'Dose Coffee';
  if t <> 'DOSE2_DHA_BAN' then raise exception 'FAIL: a clashing code should get a number (DOSE2_DHA_BAN), got %', t; end if;
  perform public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Gulshan 2","address":"3 Road","map_url":"https://maps.example/3"}', '{"visited_on":"2026-09-03"}');
  select code into t from public.cafes where area = 'Gulshan 2' and name = 'Dose Espresso';
  if t <> 'DOSE_DHA_GUL' then raise exception 'FAIL: a different neighbourhood should give DOSE_DHA_GUL, got %', t; end if;
  perform public.save_visit('{"name":"Dose Espresso","city":"Bangkok","area":"","address":"4 Road","map_url":"https://maps.example/4"}', '{"visited_on":"2026-09-04"}');
  select code into t from public.cafes where city = 'Bangkok';
  if t <> 'DOSE_BAN_XXX' then raise exception 'FAIL: a different city and no neighbourhood should give DOSE_BAN_XXX, got %', t; end if;
  perform public.save_visit('{"name":"বাংলা কফি","city":"ঢাকা","area":"","address":"5 Road","map_url":"https://maps.example/5"}', '{"visited_on":"2026-09-05"}');
  select code into t from public.cafes where name = 'বাংলা কফি';
  if t <> 'CAFE_XXX_XXX' then raise exception 'FAIL: a name in another script should fall back to CAFE_XXX_XXX, got %', t; end if;
  select count(*) - count(distinct code) into n from public.cafes;
  if n <> 0 then raise exception 'FAIL: two cafes share a code'; end if;
  raise notice 'PASS: codes follow NAME_CITY_AREA, clashes get a number, and no code repeats';

  ------------------------------------------------------------------
  -- 4. An EXISTING cafe's details are never changed by a visit
  ------------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_bob := public.save_visit('{"name":"  dose ESPRESSO","city":"dhaka","area":"BANANI","address":"HACKED","map_url":"https://evil.example"}',
                             '{"visited_on":"2026-09-03"}');
  select address into a from public.cafes where id = cafe;
  if a is distinct from '1 Original Road' then raise exception 'FAIL: a visit changed an existing cafe''s address (got %)', a; end if;
  select count(*) into n from public.cafe_revisions where cafe_id = cafe;
  if n <> 1 then raise exception 'FAIL: a visit added a history entry to an existing cafe'; end if;
  select count(*) into n from public.cafes where lower(name) = 'dose espresso' and area = 'Banani';
  if n <> 1 then raise exception 'FAIL: the same cafe typed differently was duplicated'; end if;
  raise notice 'PASS: a visit at an existing cafe stacks under it and never changes its details';

  ------------------------------------------------------------------
  -- 5. Anyone can edit a cafe, both fields must stay filled in, and it is recorded
  ------------------------------------------------------------------
  perform public.edit_cafe(cafe, '9 New Street', 'https://maps.example/new');
  select prev_address, address, changed_by into pa, a, who from public.cafe_revisions where cafe_id = cafe and kind = 'edited';
  if pa is distinct from '1 Original Road' or a is distinct from '9 New Street' or who is distinct from bob then
    raise exception 'FAIL: the edit was not recorded properly (% -> % by %)', pa, a, who; end if;
  raise notice 'PASS: anyone can edit a cafe, and the edit is recorded (old and new value, and who)';

  begin
    perform public.edit_cafe(cafe, '', 'https://maps.example/new');
    raise exception 'FAIL: an edit removed the address';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.edit_cafe(cafe, '9 New Street', '   ');
    raise exception 'FAIL: an edit removed the map link';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.edit_cafe(gen_random_uuid(), 'x', 'https://x.example');
    raise exception 'FAIL: edit_cafe accepted a cafe that does not exist';
  exception when no_data_found then null; end;
  begin
    perform public.edit_cafe(cafe, '9 New Street', 'not a link');
    raise exception 'FAIL: an edit accepted a map link that is not a link';
  exception when check_violation then null; end;
  raise notice 'PASS: an edit cannot blank a field, use a bad link, or hit a missing cafe';

  select count(*) into n from public.cafe_revisions where cafe_id = cafe;
  perform public.edit_cafe(cafe, '9 New Street', 'https://maps.example/new');           -- identical
  if (select count(*) from public.cafe_revisions where cafe_id = cafe) <> n then
    raise exception 'FAIL: an edit that changed nothing added a history entry'; end if;
  raise notice 'PASS: an edit that changes nothing adds nothing';

  ------------------------------------------------------------------
  -- 6. Past entries keep their version; new ones use the newest
  ------------------------------------------------------------------
  select count(*) into n from public.visits v join public.cafe_revisions r on r.id = v.cafe_revision_id
   where v.id = v_alice and r.address = '1 Original Road';
  if n <> 1 then raise exception 'FAIL: an edit rewrote an earlier visit''s cafe details'; end if;
  select count(*) into n from public.visits v join public.cafe_revisions r on r.id = v.cafe_revision_id
   where v.id = v_bob and r.address = '1 Original Road';
  if n <> 1 then raise exception 'FAIL: bob''s visit (logged before the edit) should keep the old version'; end if;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_pub := public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Banani"}',
                             '{"visited_on":"2026-09-05","public_note":"Great light in the afternoon","score_ambiance":5}', '[]', 'my private thought');
  select count(*) into n from public.visits v join public.cafe_revisions r on r.id = v.cafe_revision_id
   where v.id = v_pub and r.address = '9 New Street';
  if n <> 1 then raise exception 'FAIL: a new visit should use the newest cafe details'; end if;
  raise notice 'PASS: earlier visits keep their version; new visits use the newest';

  perform public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Banani"}', '{"visited_on":"2026-09-01"}', '[]', null, v_alice);
  select count(*) into n from public.visits v join public.cafe_revisions r on r.id = v.cafe_revision_id
   where v.id = v_alice and r.address = '1 Original Road';
  if n <> 1 then raise exception 'FAIL: editing a visit moved it to the newest cafe version'; end if;
  raise notice 'PASS: editing a visit keeps the version it was logged under';

  select string_agg(kind, ',' order by changed_at) into t from public.cafe_revisions where cafe_id = cafe;
  if t <> 'created,edited' then raise exception 'FAIL: history order is wrong: %', t; end if;
  raise notice 'PASS: history is in the right order (%)', t;

  ------------------------------------------------------------------
  -- 7. Public notes are public; private notes are still private
  ------------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public_note into t from public.visits where id = v_pub;
  if t is distinct from 'Great light in the afternoon' then raise exception 'FAIL: bob cannot read alice''s public note'; end if;
  select count(*) into n from public.visit_notes where visit_id = v_pub;
  if n <> 0 then raise exception 'FAIL: bob can read alice''s PRIVATE note'; end if;
  raise notice 'PASS: a public note is readable by others; the private note is not';

  ------------------------------------------------------------------
  -- 8. Clients cannot go around any of it
  ------------------------------------------------------------------
  begin
    update public.cafes set address = 'direct edit' where id = cafe;
    raise exception 'FAIL: a client updated a cafe directly';
  exception when insufficient_privilege then null; end;
  begin
    update public.cafes set name = 'Renamed' where id = cafe;
    raise exception 'FAIL: a client renamed a cafe';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.cafes where id = cafe;
    raise exception 'FAIL: a client deleted a cafe';
  exception when insufficient_privilege or restrict_violation or foreign_key_violation then null; end;
  begin
    insert into public.cafes (name, city, address, map_url) values ('Blank Cafe', 'Dhaka', null, null);
    raise exception 'FAIL: a client created a cafe with no details';
  exception when check_violation then null; end;
  begin
    insert into public.cafes (name, city, address, map_url, code) values ('Coded Cafe', 'Dhaka', '1 Road', 'https://x.example', 'MINE');
    raise exception 'FAIL: a client chose its own cafe code';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.cafes (name, city, address, map_url, created_by) values ('Forged Cafe', 'Dhaka', '1 Road', 'https://x.example', alice);
    raise exception 'FAIL: a client created a cafe in someone else''s name';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: clients cannot update, rename or delete a cafe, skip the details, choose a code, or forge an owner';

  begin
    insert into public.cafe_revisions (cafe_id, kind) values (cafe, 'edited');
    raise exception 'FAIL: a client wrote a history entry';
  exception when insufficient_privilege then null; end;
  begin
    update public.cafe_revisions set address = 'forged' where cafe_id = cafe;
    raise exception 'FAIL: a client edited history';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.cafe_revisions where cafe_id = cafe;
    raise exception 'FAIL: a client deleted history';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: history cannot be written, changed or deleted by clients';

  reset role;
  set local role anon;
  begin
    perform public.edit_cafe(cafe, 'x', 'https://x.example');
    raise exception 'FAIL: anon called edit_cafe';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.cafe_revisions;
    raise exception 'FAIL: anon read history';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.cafes;
    raise exception 'FAIL: anon read the directory';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: logged-out visitors can do none of it';

  ------------------------------------------------------------------
  -- 9. The directory keeps a cafe (and its history) when every visit is deleted
  ------------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.visits where cafe_id = cafe and user_id = alice;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.visits where cafe_id = cafe and user_id = bob;
  select count(*) into n from public.visits where cafe_id = cafe;
  if n <> 0 then raise exception 'FAIL: the test should have deleted every visit'; end if;
  select count(*) into n from public.cafes where id = cafe;
  if n <> 1 then raise exception 'FAIL: a cafe vanished when its last visit was deleted'; end if;
  select count(*) into n from public.cafe_revisions where cafe_id = cafe;
  if n <> 2 then raise exception 'FAIL: history was lost with the visits'; end if;
  -- ...and re-adding it stacks under the SAME cafe, not a new one
  perform public.save_visit('{"name":"Dose Espresso","city":"Dhaka","area":"Banani"}', '{"visited_on":"2026-09-20"}');
  select count(*) into n from public.cafes where name = 'Dose Espresso' and area = 'Banani';
  if n <> 1 then raise exception 'FAIL: re-adding a cafe made a duplicate'; end if;
  select address into a from public.cafes where id = cafe;
  if a is distinct from '9 New Street' then raise exception 'FAIL: re-adding lost the cafe''s details'; end if;
  raise notice 'PASS: a cafe and its history survive losing every visit, and a later visit reuses it';

  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
