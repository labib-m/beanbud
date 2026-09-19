-- =====================================================================
-- Bean Bud — security policy checks
--
-- Run in the Supabase SQL editor of a SCRATCH project (not your real one),
-- AFTER the migration. It creates two pretend users, alice and bob, tries
-- to do things each should and should not be allowed to do, and prints
-- PASS or raises FAIL for every one.
--
-- It ends with ROLLBACK, so nothing it creates is kept.
--
-- If everything is right, the last line returns "ALL CHECKS PASSED".
-- The first failing check stops the script with an error that starts with
-- "FAIL:" and names what broke. (The PASS lines are RAISE NOTICE output;
-- the Supabase dashboard may not show them, so trust the last line.)
-- =====================================================================
begin;

do $$
declare
  alice uuid := '00000000-0000-0000-0000-00000000a11c';
  bob   uuid := '00000000-0000-0000-0000-0000000000b0';
  cafe  uuid;
  visit uuid;
  drink uuid;
  n     int;
begin
  -- Two pretend accounts. The signup trigger should give each a profile.
  insert into auth.users (id, aud, role, email)
  values (alice, 'authenticated', 'authenticated', 'alice@test.invalid'),
         (bob,   'authenticated', 'authenticated', 'bob@test.invalid');

  select count(*) into n from public.profiles where id in (alice, bob);
  if n <> 2 then raise exception 'FAIL: signup trigger did not create profiles (got %)', n; end if;
  raise notice 'PASS: signing up creates a profile automatically';

  ------------------------------------------------------------------
  -- Logged out (anon)
  ------------------------------------------------------------------
  set local role anon;
  begin
    perform 1 from public.visits;
    raise exception 'FAIL: anon was able to read visits';
  exception when insufficient_privilege then
    raise notice 'PASS: logged-out visitor cannot read visits';
  end;
  begin
    perform 1 from public.profiles;
    raise exception 'FAIL: anon was able to read profiles';
  exception when insufficient_privilege then
    raise notice 'PASS: logged-out visitor cannot read profiles';
  end;
  reset role;

  ------------------------------------------------------------------
  -- Alice does normal things
  ------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.cafes (name, city, area, address, map_url) values ('Test Cafe', 'Dhaka', 'Gulshan 2', '1 Test Road', 'https://maps.example/t') returning id into cafe;
  insert into public.visits (cafe_id, visited_on, score_ambiance, score_food)
    values (cafe, '2026-09-01', 4, 5) returning id into visit;
  insert into public.visit_drinks (visit_id, drink_type, price, score)
    values (visit, 'Flat white', 300, 4) returning id into drink;
  insert into public.visit_notes (visit_id, notes) values (visit, 'alice private thoughts');
  raise notice 'PASS: alice can add a cafe, a visit, a drink and a private note (created_by / user_id fill in automatically)';

  select count(*) into n from public.visit_notes where visit_id = visit;
  if n <> 1 then raise exception 'FAIL: alice cannot read her own note'; end if;
  raise notice 'PASS: alice can read her own note';

  select count(*) into n from public.visits where id = visit and user_id = alice and overall = 4.5;
  if n <> 1 then raise exception 'FAIL: user_id default or overall average is wrong'; end if;
  raise notice 'PASS: overall score is the average of the rated criteria (4 and 5 -> 4.5)';

  -- Alice cannot forge a visit for bob.
  begin
    insert into public.visits (user_id, cafe_id, visited_on) values (bob, cafe, '2026-09-02');
    raise exception 'FAIL: alice created a visit as bob';
  exception when insufficient_privilege then
    raise notice 'PASS: alice cannot create a visit in bob''s name';
  end;

  -- Alice cannot hand her visit to bob.
  begin
    update public.visits set user_id = bob where id = visit;
    raise exception 'FAIL: alice reassigned her visit to bob';
  exception when insufficient_privilege then
    raise notice 'PASS: alice cannot reassign her visit to someone else';
  end;

  -- Nobody deletes a cafe: it is part of the shared directory. (Before 20260920000300 this was refused
  -- only while visits pointed at it; now it is refused always.)
  begin
    delete from public.cafes where id = cafe;
    raise exception 'FAIL: a cafe was deleted';
  exception when restrict_violation or foreign_key_violation or insufficient_privilege then
    raise notice 'PASS: a cafe cannot be deleted';
  end;

  ------------------------------------------------------------------
  -- Bob, a different logged-in user
  ------------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- What bob CAN do (deliberate: this is the social part of the app)
  select count(*) into n from public.visits where id = visit;
  if n <> 1 then raise exception 'FAIL: bob cannot see alice''s visit (feed would be empty)'; end if;
  select count(*) into n from public.visit_drinks where id = drink;
  if n <> 1 then raise exception 'FAIL: bob cannot see alice''s drink'; end if;
  select count(*) into n from public.cafes where id = cafe;
  if n <> 1 then raise exception 'FAIL: bob cannot see the shared cafe'; end if;
  raise notice 'PASS: bob can read alice''s visit, drink and cafe (intended: feed and compare)';

  -- What bob CANNOT do. Updates/deletes he isn't allowed fail SILENTLY
  -- (0 rows), so we count the rows affected.
  -- Notes are private: bob sees nothing, and cannot change or add any.
  select count(*) into n from public.visit_notes;
  if n <> 0 then raise exception 'FAIL: bob can read alice''s private notes'; end if;
  raise notice 'PASS: bob cannot read alice''s notes (he sees 0 notes)';

  update public.visit_notes set notes = 'hacked' where visit_id = visit;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: bob edited alice''s note'; end if;
  raise notice 'PASS: bob cannot edit alice''s note';

  delete from public.visit_notes where visit_id = visit;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: bob deleted alice''s note'; end if;
  raise notice 'PASS: bob cannot delete alice''s note';

  begin
    insert into public.visit_notes (visit_id, notes) values (visit, 'bob was here');
    raise exception 'FAIL: bob added a note to alice''s visit';
  exception when insufficient_privilege or unique_violation then
    raise notice 'PASS: bob cannot add a note to alice''s visit';
  end;

  update public.visits set spend = 'hacked' where id = visit;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: bob edited alice''s visit'; end if;
  raise notice 'PASS: bob''s edit of alice''s visit changed 0 rows';

  delete from public.visits where id = visit;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: bob deleted alice''s visit'; end if;
  raise notice 'PASS: bob''s delete of alice''s visit removed 0 rows';

  -- (After 20260920000300 clients may not change a cafe's name at all, so this is refused outright;
  --  before it, the row security rules made it change 0 rows. Either way it must not succeed.)
  begin
    update public.cafes set name = 'Hacked' where id = cafe;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: bob edited alice''s cafe'; end if;
  exception when insufficient_privilege then
    null;
  end;
  select count(*) into n from public.cafes where id = cafe and name = 'Test Cafe';
  if n <> 1 then raise exception 'FAIL: the cafe name changed'; end if;
  raise notice 'PASS: bob cannot edit a cafe alice added';

  begin
    delete from public.cafes where id = cafe;
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: bob deleted alice''s cafe'; end if;
  exception when insufficient_privilege or restrict_violation or foreign_key_violation then
    null;
  end;
  raise notice 'PASS: bob cannot delete a cafe alice added';

  update public.visit_drinks set price = 1 where id = drink;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: bob edited alice''s drink'; end if;
  raise notice 'PASS: bob cannot edit alice''s drink';

  delete from public.visit_drinks where id = drink;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: bob deleted alice''s drink'; end if;
  raise notice 'PASS: bob cannot delete alice''s drink';

  update public.profiles set tagline = 'hacked' where id = alice;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: bob edited alice''s profile'; end if;
  raise notice 'PASS: bob cannot edit alice''s profile';

  -- Inserts he isn't allowed fail LOUDLY (an error).
  begin
    insert into public.visit_drinks (visit_id, drink_type) values (visit, 'Sneaky latte');
    raise exception 'FAIL: bob added a drink to alice''s visit';
  exception when insufficient_privilege then
    raise notice 'PASS: bob cannot add a drink to alice''s visit';
  end;

  begin
    insert into public.cafes (name, city, address, map_url, created_by) values ('Forged', 'Dhaka', '1 Road', 'https://x.example', alice);
    raise exception 'FAIL: bob created a cafe in alice''s name';
  exception when insufficient_privilege then
    raise notice 'PASS: bob cannot create a cafe in alice''s name';
  end;

  -- Bob CAN edit his own profile.
  update public.profiles set tagline = 'bob was here' where id = bob;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: bob cannot edit his own profile'; end if;
  raise notice 'PASS: bob can edit his own profile';

  -- Alice's data is untouched after all that.
  reset role;
  select count(*) into n from public.visits v
    join public.visit_notes vn on vn.visit_id = v.id
    where v.id = visit and v.spend is null and vn.notes = 'alice private thoughts';
  if n <> 1 then raise exception 'FAIL: alice''s visit or note was changed'; end if;
  raise notice 'PASS: alice''s data is exactly as she left it';
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
