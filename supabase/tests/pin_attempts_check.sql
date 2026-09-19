-- =====================================================================
-- Bean Bud — PIN attempt limiter checks
-- Run in the Supabase SQL editor AFTER 20260919000300_pin_attempts.sql.
-- Ends with ROLLBACK (nothing is kept); last line returns ALL CHECKS PASSED.
-- =====================================================================
begin;

do $$
declare
  a boolean; m int; i int;
begin
  -- Attempts 1 to 5 are all allowed.
  for i in 1..5 loop
    select allowed, minutes_left into a, m from public.pin_attempt_begin('test_user', 5, 15, 1440);
    if not a then raise exception 'FAIL: attempt % should be allowed', i; end if;
  end loop;
  raise notice 'PASS: first 5 attempts are allowed';

  -- The 6th is blocked, for about 15 minutes.
  select allowed, minutes_left into a, m from public.pin_attempt_begin('test_user', 5, 15, 1440);
  if a then raise exception 'FAIL: 6th attempt should be blocked'; end if;
  if m not between 14 and 15 then raise exception 'FAIL: expected ~15 minutes lock, got %', m; end if;
  raise notice 'PASS: 6th attempt is blocked for % minutes', m;

  -- Still blocked on repeat, and other usernames are unaffected.
  select allowed into a from public.pin_attempt_begin('test_user', 5, 15, 1440);
  if a then raise exception 'FAIL: still supposed to be locked'; end if;
  select allowed into a from public.pin_attempt_begin('someone_else', 5, 15, 1440);
  if not a then raise exception 'FAIL: another username was affected'; end if;
  raise notice 'PASS: lock is per username';

  -- After the lock passes, 5 more tries are allowed, then the wait doubles.
  update public.login_attempts set locked_until = now() - interval '1 minute' where handle = 'test_user';
  for i in 1..5 loop
    select allowed into a from public.pin_attempt_begin('test_user', 5, 15, 1440);
    if not a then raise exception 'FAIL: attempt % after unlock should be allowed', i; end if;
  end loop;
  select allowed, minutes_left into a, m from public.pin_attempt_begin('test_user', 5, 15, 1440);
  if a or m not between 29 and 30 then raise exception 'FAIL: second lock should be ~30 minutes, got %', m; end if;
  raise notice 'PASS: second lock is ~30 minutes (doubles)';

  -- The wait never exceeds the cap.
  update public.login_attempts set lockouts = 20, failures = 4, locked_until = null where handle = 'test_user';
  select allowed into a from public.pin_attempt_begin('test_user', 5, 15, 1440);
  select minutes_left into m from public.pin_attempt_begin('test_user', 5, 15, 1440);
  if m not between 1439 and 1440 then raise exception 'FAIL: lock should cap at 1440 minutes, got %', m; end if;
  raise notice 'PASS: lock is capped at 24 hours';

  -- Clearing (correct PIN / reset by email) starts fresh.
  delete from public.login_attempts where handle = 'test_user';
  select allowed into a from public.pin_attempt_begin('test_user', 5, 15, 1440);
  if not a then raise exception 'FAIL: not allowed after clearing'; end if;
  raise notice 'PASS: clearing the record starts fresh';

  -- Browser roles must have no access to the table or the function.
  set local role authenticated;
  begin
    perform 1 from public.login_attempts;
    raise exception 'FAIL: authenticated could read login_attempts';
  exception when insufficient_privilege then
    raise notice 'PASS: logged-in users cannot read login_attempts';
  end;
  begin
    perform * from public.pin_attempt_begin('x', 5, 15, 1440);
    raise exception 'FAIL: authenticated could call pin_attempt_begin';
  exception when insufficient_privilege then
    raise notice 'PASS: logged-in users cannot call pin_attempt_begin';
  end;
  reset role;
  set local role anon;
  begin
    perform 1 from public.login_attempts;
    raise exception 'FAIL: anon could read login_attempts';
  exception when insufficient_privilege then
    raise notice 'PASS: logged-out visitors cannot read login_attempts';
  end;
  reset role;
end
$$;

rollback;

select 'ALL CHECKS PASSED' as result;
