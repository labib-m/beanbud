-- =====================================================================
-- Bean Bud — push notification subscriptions
--
--   * Each signed-in device that turns notifications on gets one row here:
--     the "address" (endpoint) the browser's push service gave it, plus the
--     two keys needed to encrypt a message to it. None of this is a secret
--     that unlocks anything on its own; it only works together with the
--     VAPID private key, which lives only in the send-push Edge Function.
--   * Clients never read, write or delete this table directly. Two small
--     functions do it on their behalf (below), same pattern as save_visit().
--   * The actual sending happens in the send-push Edge Function, called by
--     a Database Webhook when a visit is inserted or updated. See README.
-- =====================================================================
begin;

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null,
  p256dh_key text not null,   -- PushSubscription.toJSON().keys.p256dh
  auth_key   text not null,   -- PushSubscription.toJSON().keys.auth
  created_at timestamptz not null default now()
);

-- One row per browser subscription. Re-subscribing the same device (e.g. after
-- reinstalling the home-screen icon on the same account) updates its row instead
-- of piling up duplicates.
create unique index push_subscriptions_endpoint_key on public.push_subscriptions (endpoint);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
-- No policies: only the two functions below (security definer) and the
-- send-push Edge Function (service role, which bypasses RLS) touch this table.


-- ---------------------------------------------------------------------
-- save_push_subscription(): turn notifications on for this device
-- ---------------------------------------------------------------------
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if nullif(btrim(p_endpoint), '') is null or nullif(btrim(p_p256dh), '') is null or nullif(btrim(p_auth_key), '') is null then
    raise exception 'incomplete subscription' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth_key)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh_key = excluded.p256dh_key, auth_key = excluded.auth_key, created_at = now();
end;
$$;

revoke all on function public.save_push_subscription(text, text, text) from public;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- delete_push_subscription(): turn notifications off for this device
-- ---------------------------------------------------------------------
create function public.delete_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;

revoke all on function public.delete_push_subscription(text) from public;
grant execute on function public.delete_push_subscription(text) to authenticated;

commit;
