-- =====================================================================
-- Bean Bud — cafe cleanup, and who can set a cafe's address
--
-- Run in the Supabase SQL editor AFTER these two migrations:
--   20260920000100_cafe_cleanup.sql
--   20260920000200_save_visit_cafe_edit.sql
-- Ends with ROLLBACK (nothing is kept); the last line returns ALL CHECKS PASSED.
-- A failing check stops the script with an error starting "FAIL:".
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  v1 uuid; va uuid; vb uuid; v3a uuid; v3b uuid; v4 uuid; v5 uuid;
  vs uuid;
  n int; addr text;
begin
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');

  ------------------------------------------------------------------
  -- 1. Deleting the only visit removes the cafe
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.cafes (name, city) values ('Cleanup One', 'Dhaka') returning id into c1;
  insert into public.visits (cafe_id, visited_on) values (c1, '2026-09-01') returning id into v1;
  delete from public.visits where id = v1;
  select count(*) into n from public.cafes where id = c1;
  if n <> 0 then raise exception 'FAIL: the cafe should be gone after its only visit was deleted'; end if;
  raise notice 'PASS: deleting the only visit removes the cafe';

  ------------------------------------------------------------------
  -- 2. A cafe with another person's visit stays
  ------------------------------------------------------------------
  insert into public.cafes (name, city) values ('Cleanup Two', 'Dhaka') returning id into c2;
  insert into public.visits (cafe_id, visited_on) values (c2, '2026-09-01') returning id into va;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.visits (cafe_id, visited_on) values (c2, '2026-09-02') returning id into vb;
  delete from public.visits where id = vb;           -- bob leaves; alice still has a visit
  select count(*) into n from public.cafes where id = c2;
  if n <> 1 then raise exception 'FAIL: cafe was deleted while alice still had a visit'; end if;
  raise notice 'PASS: a cafe still visited by someone else stays';

  ------------------------------------------------------------------
  -- 3. The LAST visit is deleted by someone who did NOT add the cafe: it still goes
  --    (this is the case that needs the trigger to run with the owner's rights)
  ------------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.cafes (name, city) values ('Cleanup Three', 'Dhaka') returning id into c3;
  insert into public.visits (cafe_id, visited_on) values (c3, '2026-09-01') returning id into v3a;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.visits (cafe_id, visited_on) values (c3, '2026-09-02') returning id into v3b;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.visits where id = v3a;           -- the creator leaves first
  select count(*) into n from public.cafes where id = c3;
  if n <> 1 then raise exception 'FAIL: cafe deleted while bob still visits it'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.visits where id = v3b;           -- bob, NOT the creator, deletes the last one
  select count(*) into n from public.cafes where id = c3;
  if n <> 0 then raise exception 'FAIL: cafe left behind after a non-creator deleted its last visit'; end if;
  raise notice 'PASS: the cafe goes even when someone other than its creator deletes the last visit';

  ------------------------------------------------------------------
  -- 4. Moving a visit to another cafe removes the cafe it left
  ------------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.cafes (name, city) values ('Cleanup Four', 'Dhaka') returning id into c4;
  insert into public.cafes (name, city) values ('Cleanup Five', 'Dhaka') returning id into c5;
  insert into public.visits (cafe_id, visited_on) values (c4, '2026-09-01') returning id into v4;
  insert into public.visits (cafe_id, visited_on) values (c5, '2026-09-02') returning id into v5;
  update public.visits set cafe_id = c5 where id = v4;
  select count(*) into n from public.cafes where id = c4;
  if n <> 0 then raise exception 'FAIL: the cafe a visit moved away from should be gone'; end if;
  select count(*) into n from public.cafes where id = c5;
  if n <> 1 then raise exception 'FAIL: the cafe a visit moved to should remain'; end if;
  raise notice 'PASS: moving a visit removes the cafe it left and keeps the one it joined';

  -- editing a visit WITHOUT moving it leaves everything alone
  update public.visits set spend = 'x' where id = v5;
  select count(*) into n from public.cafes where id = c5;
  if n <> 1 then raise exception 'FAIL: an ordinary edit removed a cafe'; end if;
  raise notice 'PASS: an ordinary edit removes nothing';

  ------------------------------------------------------------------
  -- 5. The creator can correct an EXISTING address / map link through save_visit; nobody
  --    else can; and an empty box never wipes what is saved
  ------------------------------------------------------------------
  vs := public.save_visit('{"name":"Address Test","city":"Dhaka","area":"Banani","address":"First address"}',
                          '{"visited_on":"2026-09-10"}');
  select address into addr from public.cafes where name = 'Address Test';
  if addr is distinct from 'First address' then raise exception 'FAIL: initial address not saved (got %)', addr; end if;

  perform public.save_visit('{"name":"Address Test","city":"Dhaka","area":"Banani","address":"Corrected address","map_url":"https://maps.example/x"}',
                            '{"visited_on":"2026-09-11"}');
  select address into addr from public.cafes where name = 'Address Test';
  if addr is distinct from 'Corrected address' then raise exception 'FAIL: the creator could not correct the address (got %)', addr; end if;
  select count(*) into n from public.cafes where name = 'Address Test' and map_url = 'https://maps.example/x';
  if n <> 1 then raise exception 'FAIL: the creator could not add a map link'; end if;
  raise notice 'PASS: the creator can correct the address and add a map link';

  perform public.save_visit('{"name":"Address Test","city":"Dhaka","area":"Banani","address":"","map_url":""}',
                            '{"visited_on":"2026-09-12"}');
  select address into addr from public.cafes where name = 'Address Test';
  if addr is distinct from 'Corrected address' then raise exception 'FAIL: empty boxes wiped the address (got %)', addr; end if;
  raise notice 'PASS: empty address boxes do not wipe a saved address';

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.save_visit('{"name":"Address Test","city":"Dhaka","area":"Banani","address":"HACKED","map_url":"https://evil.example"}',
                            '{"visited_on":"2026-09-13"}');
  select address into addr from public.cafes where name = 'Address Test';
  if addr is distinct from 'Corrected address' then raise exception 'FAIL: a non-creator changed the address (got %)', addr; end if;
  select count(*) into n from public.cafes where name = 'Address Test' and map_url = 'https://maps.example/x';
  if n <> 1 then raise exception 'FAIL: a non-creator changed the map link'; end if;
  select count(*) into n from public.visits where user_id = bob and visited_on = '2026-09-13';
  if n <> 1 then raise exception 'FAIL: bob''s own visit should still have been saved'; end if;
  raise notice 'PASS: someone else cannot change an existing address, but their visit still saves';

  ------------------------------------------------------------------
  -- 6. Anyone can fill a BLANK address / map link, once, but never overwrite it
  ------------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.save_visit('{"name":"Blank Test","city":"Dhaka","area":"Banani"}', '{"visited_on":"2026-09-14"}');
  select count(*) into n from public.cafes where name = 'Blank Test' and address is null and map_url is null;
  if n <> 1 then raise exception 'FAIL: the test cafe should start with no address and no map link'; end if;

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.save_visit('{"name":"Blank Test","city":"Dhaka","area":"Banani","address":"Bob filled this in","map_url":"https://maps.example/bob"}',
                            '{"visited_on":"2026-09-15"}');
  select address into addr from public.cafes where name = 'Blank Test';
  if addr is distinct from 'Bob filled this in' then raise exception 'FAIL: a non-creator could not fill a blank address (got %)', addr; end if;
  select count(*) into n from public.cafes where name = 'Blank Test' and map_url = 'https://maps.example/bob';
  if n <> 1 then raise exception 'FAIL: a non-creator could not fill a blank map link'; end if;
  raise notice 'PASS: anyone can fill a blank address and map link';

  -- ...but once it is filled, a non-creator cannot change it
  perform public.save_visit('{"name":"Blank Test","city":"Dhaka","area":"Banani","address":"Bob changes his mind","map_url":"https://maps.example/other"}',
                            '{"visited_on":"2026-09-16"}');
  select address into addr from public.cafes where name = 'Blank Test';
  if addr is distinct from 'Bob filled this in' then raise exception 'FAIL: a non-creator overwrote a filled address (got %)', addr; end if;
  raise notice 'PASS: a filled address cannot be overwritten by a non-creator';

  -- the creator (alice) CAN still correct it
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.save_visit('{"name":"Blank Test","city":"Dhaka","area":"Banani","address":"Alice corrects it"}', '{"visited_on":"2026-09-17"}');
  select address into addr from public.cafes where name = 'Blank Test';
  if addr is distinct from 'Alice corrects it' then raise exception 'FAIL: the creator could not correct the address (got %)', addr; end if;
  raise notice 'PASS: the creator can still correct it';

  -- a logged-out visitor cannot call the helper at all
  reset role;
  set local role anon;
  begin
    perform public.fill_cafe_blanks(gen_random_uuid(), 'x', 'https://x.example');
    raise exception 'FAIL: anon called fill_cafe_blanks';
  exception when insufficient_privilege then
    raise notice 'PASS: logged-out visitors cannot call the helper';
  end;
  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
