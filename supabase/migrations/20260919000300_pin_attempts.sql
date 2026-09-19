-- =====================================================================
-- Bean Bud — PIN sign-in attempt limiter
--
-- A 4-digit PIN has only 10,000 possibilities, so guessing has to be
-- throttled. Each USERNAME (whether or not it exists) gets a counter:
--   * 5 wrong tries  -> locked for 15 minutes
--   * each further lock doubles the wait, up to 24 hours
--   * a correct PIN, or a PIN reset by email, clears it
--
-- Only the server (Edge Function, using the service role) ever touches
-- this table. Logged-in users and logged-out visitors get NO access at all.
-- =====================================================================
begin;

create table public.login_attempts (
  handle       text primary key check (char_length(handle) <= 24),  -- lower-cased username
  failures     smallint    not null default 0,
  lockouts     smallint    not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);

-- RLS on with NO policies = nobody but the service role can read or write.
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;
grant all on public.login_attempts to service_role;

-- Counts an attempt BEFORE the PIN is checked, atomically. Doing it this way
-- matters: if the check came first, an attacker could fire thousands of
-- guesses at the same instant, all passing the "not locked yet" test.
-- "for update" makes simultaneous calls take turns, so at most
-- p_max_failures guesses are ever allowed per lock cycle.
create function public.pin_attempt_begin(
  p_handle        text,
  p_max_failures  int,
  p_base_minutes  int,
  p_max_minutes   int
)
returns table (allowed boolean, minutes_left int)
language plpgsql
set search_path = ''
as $$
declare
  v_failures     int;
  v_lockouts     int;
  v_locked_until timestamptz;
  v_mins         int;
begin
  insert into public.login_attempts (handle) values (p_handle)
  on conflict (handle) do nothing;

  select failures, lockouts, locked_until
    into v_failures, v_lockouts, v_locked_until
    from public.login_attempts
   where handle = p_handle
     for update;

  if v_locked_until is not null and v_locked_until > now() then
    return query select false, ceil(extract(epoch from (v_locked_until - now())) / 60)::int;
    return;
  end if;

  v_failures := v_failures + 1;
  if v_failures >= p_max_failures then
    v_lockouts := v_lockouts + 1;
    v_mins := least(p_base_minutes * power(2, least(v_lockouts - 1, 12))::int, p_max_minutes);
    v_locked_until := now() + make_interval(mins => v_mins);
    v_failures := 0;   -- this attempt is still checked; the lock applies to the next one
  end if;

  update public.login_attempts
     set failures = v_failures, lockouts = v_lockouts,
         locked_until = v_locked_until, updated_at = now()
   where handle = p_handle;

  return query select true, 0;
end;
$$;

-- Callable only by the server, never from the browser.
revoke execute on function public.pin_attempt_begin(text, int, int, int) from public, anon, authenticated;
grant  execute on function public.pin_attempt_begin(text, int, int, int) to service_role;

commit;
