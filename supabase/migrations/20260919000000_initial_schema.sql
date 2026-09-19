-- =====================================================================
-- Bean Bud — initial schema
--
-- Four tables:
--   profiles      one row per person (name, @handle, tagline, usual order)
--   cafes         one row per real-world cafe, shared by everyone
--   visits        one row per time someone went to a cafe (ratings, notes)
--   visit_drinks  one row per drink ordered on a visit (type, price, score)
--   visit_notes   the private free-text notes for a visit (owner-only)
--
-- Everything runs in one transaction: if any statement fails, nothing is
-- applied and you are not left with half a database.
-- =====================================================================
begin;


-- ---------------------------------------------------------------------
-- Helper: keep updated_at honest
-- ---------------------------------------------------------------------
-- The browser never sets updated_at; the database does it on every UPDATE.
-- "set search_path = ''" is a security habit: the function can only see
-- things by their full name (public.xxx), so nobody can trick it into
-- calling a look-alike function.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
-- id is the Supabase Auth user id. "on delete cascade" means deleting an
-- account in Supabase Auth also deletes its profile (and, below, its
-- visits and drinks). That is what you want for a "delete my account" flow.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 60),
  handle       text check (handle is null or handle ~ '^[A-Za-z0-9_.-]{2,24}$'),
  home_city    text check (char_length(home_city)  <= 60),
  tagline      text check (char_length(tagline)    <= 90),
  usual_order  text check (char_length(usual_order) <= 100),
  about        text check (char_length(about)      <= 400),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Handles are unique ignoring case (@Labib and @labib are the same person).
-- Rows with no handle yet don't collide with each other.
create unique index profiles_handle_key on public.profiles (lower(handle));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- Every new sign-up gets an empty profile row automatically. Without this,
-- a new user's first visit insert would fail (visits point at profiles).
-- "security definer" = runs with the migration owner's rights, because the
-- person signing up is not allowed to write to profiles yet.
-- Only the id is copied: we deliberately do NOT copy the email or the
-- Google/Apple name into a table that every signed-in user can read.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- If you already signed up in this Supabase project BEFORE running this
-- migration, the trigger above never saw you. This gives existing users a
-- profile too. Harmless to re-run.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- cafes
-- ---------------------------------------------------------------------
-- Only facts about the PLACE live here. Things that can differ from visit
-- to visit or person to person (price band, parking, opening hours you
-- saw, amenities) stay on the visit. That keeps this shared table simple
-- to protect: nobody ever needs to edit someone else's cafe row.
create table public.cafes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (btrim(name) <> '' and char_length(name) <= 120),
  city       text not null check (btrim(city) <> '' and char_length(city) <= 80),
  area       text not null default '' check (char_length(area) <= 80),
  address    text check (char_length(address) <= 300),
  -- Must start with http(s)://  — blocks "javascript:..." links being
  -- saved into something the app later renders as a clickable link.
  map_url    text check (map_url is null or map_url ~* '^https?://'),

  -- The identity of a cafe: name + city + neighbourhood, lower-cased with
  -- extra spaces collapsed. "Second Cup / Dhaka / Dhanmondi" and
  -- "second  cup / dhaka / dhanmondi" are the same cafe; a Second Cup in
  -- Gulshan 2 is a different one. The database computes this itself.
  cafe_key   text generated always as (
      lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) || '|' ||
      lower(regexp_replace(btrim(city), '\s+', ' ', 'g')) || '|' ||
      lower(regexp_replace(btrim(area), '\s+', ' ', 'g'))
    ) stored,

  -- Who added it. Defaults to whoever is logged in, so the app doesn't
  -- have to send it. set null: if that person deletes their account the
  -- cafe stays (other people have visits there); nobody can edit it after.
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cafes_cafe_key_key unique (cafe_key)
);

create index cafes_created_by_idx on public.cafes (created_by);

create trigger cafes_set_updated_at
  before update on public.cafes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- visits
-- ---------------------------------------------------------------------
create table public.visits (
  id            uuid primary key default gen_random_uuid(),

  -- Whose visit this is. Defaults to the logged-in user.
  -- on delete cascade: delete the account, delete its visits.
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,

  -- restrict: you cannot delete a cafe that still has visits. The database
  -- refuses with an error instead of silently wiping people's history.
  cafe_id       uuid not null references public.cafes (id) on delete restrict,

  -- No default on purpose. current_date would be the server's (UTC) date,
  -- which is the wrong day for a Dhaka morning. The app sends the date.
  visited_on    date not null,

  -- 1 to 5, or NULL for "didn't rate this". (The old app stored 0 for
  -- "unset"; 0 is not a rating, so it becomes NULL here.)
  score_ambiance smallint check (score_ambiance between 1 and 5),
  score_drinks   smallint check (score_drinks   between 1 and 5),
  score_food     smallint check (score_food     between 1 and 5),
  score_service  smallint check (score_service  between 1 and 5),
  score_crowd    smallint check (score_crowd    between 1 and 5),

  -- Average of whichever scores were filled in, computed by the database
  -- so the feed, notebook and "compare" all agree. NULL if nothing rated.
  overall       numeric generated always as (
      case
        when (score_ambiance is not null)::int + (score_drinks is not null)::int
           + (score_food is not null)::int + (score_service is not null)::int
           + (score_crowd is not null)::int = 0
        then null
        else (coalesce(score_ambiance, 0) + coalesce(score_drinks, 0) + coalesce(score_food, 0)
            + coalesce(score_service, 0) + coalesce(score_crowd, 0))::numeric
           / ((score_ambiance is not null)::int + (score_drinks is not null)::int
            + (score_food is not null)::int + (score_service is not null)::int
            + (score_crowd is not null)::int)
      end
    ) stored,

  verdict       text check (verdict in ('regular', 'return', 'once')),
  -- (The free-text "notes" are NOT here. They live in visit_notes below so
  -- that only the visit's owner can ever read them.)

  -- Prices on this visit's drinks are in this currency (ISO code, e.g. BDT).
  currency      text check (currency ~ '^[A-Z]{3}$'),
  price_band    smallint check (price_band between 1 and 4),
  spend         text check (char_length(spend) <= 100),

  opens         time,
  closes        time,
  hours_note    text check (char_length(hours_note) <= 300),
  parking       text check (char_length(parking) <= 100),
  parking_note  text check (char_length(parking_note) <= 300),
  area_note     text check (char_length(area_note) <= 1000),
  good_for      text[] not null default '{}',
  amenities     text[] not null default '{}',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Postgres does not index foreign keys on its own. These serve: "my
-- notebook", "all visits to this cafe", and "the feed, newest first".
-- user_id is also the column the security policies test, so it matters
-- for speed as well as for the notebook.
create index visits_user_date_idx on public.visits (user_id, visited_on desc);
create index visits_cafe_idx      on public.visits (cafe_id);
create index visits_feed_idx      on public.visits (visited_on desc, created_at desc);

create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- visit_drinks
-- ---------------------------------------------------------------------
-- One row per drink. This is what the Milestones screen counts
-- ("47 of 50 coffees logged") and what "best iced americano" queries use.
-- Drink type is free text because the app lets you type your own.
create table public.visit_drinks (
  id         uuid primary key default gen_random_uuid(),
  visit_id   uuid not null references public.visits (id) on delete cascade,
  drink_type text not null check (btrim(drink_type) <> '' and char_length(drink_type) <= 60),
  price      numeric(14, 3) check (price is null or price >= 0),   -- NULL = no price noted
  score      smallint check (score between 1 and 5),                -- NULL = not rated
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index visit_drinks_visit_idx on public.visit_drinks (visit_id);


-- ---------------------------------------------------------------------
-- visit_notes  (PRIVATE)
-- ---------------------------------------------------------------------
-- Security rules apply to whole rows, not to single columns, so private
-- text can't sit in the same table as data everyone may read. It gets its
-- own table, at most one row per visit, and only the owner can see it.
-- Delete the visit and its note goes with it.
create table public.visit_notes (
  visit_id   uuid primary key references public.visits (id) on delete cascade,
  notes      text not null check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger visit_notes_set_updated_at
  before update on public.visit_notes
  for each row execute function public.set_updated_at();


-- =====================================================================
-- SECURITY
-- =====================================================================
-- Two independent locks, on purpose:
--   1. GRANTs   — which database roles may touch which table at all.
--   2. POLICIES — which ROWS a permitted role may see or change.
-- A row is reachable only if both allow it.
--
-- Supabase gives every request one of two roles:
--   anon           = anyone holding your public key, not logged in
--   authenticated  = someone logged in
-- ---------------------------------------------------------------------

-- Lock 1a: start from zero. Supabase hands out broad default permissions
-- on new tables; take them all back, then give back only what's needed.
revoke all on public.profiles, public.cafes, public.visits, public.visit_drinks, public.visit_notes
  from anon, authenticated;

-- Logged-out visitors get nothing. Ever. (No grant = "permission denied".)

-- Lock 1b: logged-in users get only the verbs the app uses.
grant select, update                 on public.profiles     to authenticated;  -- rows are created by the trigger, removed by cascade
grant select, insert, update, delete on public.cafes        to authenticated;
grant select, insert, update, delete on public.visits       to authenticated;
grant select, insert, update, delete on public.visit_drinks to authenticated;
grant select, insert, update, delete on public.visit_notes  to authenticated;

-- Lock 2: switch row-level security on. From this line, a table with RLS
-- on and no matching policy shows zero rows and accepts zero writes.
alter table public.profiles     enable row level security;
alter table public.cafes        enable row level security;
alter table public.visits       enable row level security;
alter table public.visit_drinks enable row level security;
alter table public.visit_notes  enable row level security;

-- Notes on the policy text below:
--  * "to authenticated" ties each policy to logged-in users only.
--  * "(select auth.uid())" is the logged-in user's id. Wrapping it in
--    "select" makes Postgres evaluate it once per query instead of once
--    per row — same meaning, much faster.
--  * USING     = which existing rows the statement may see / touch.
--  * WITH CHECK = what a new or changed row must look like afterwards.


-- ---- profiles -------------------------------------------------------
create policy "profiles: signed-in users can read all"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles: you can edit only your own"
  on public.profiles for update to authenticated
  using      (id = (select auth.uid()))
  with check (id = (select auth.uid()));


-- ---- cafes ----------------------------------------------------------
create policy "cafes: signed-in users can read all"
  on public.cafes for select to authenticated
  using (true);

create policy "cafes: you can add cafes as yourself"
  on public.cafes for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "cafes: you can edit only cafes you added"
  on public.cafes for update to authenticated
  using      (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "cafes: you can delete only cafes you added"
  on public.cafes for delete to authenticated
  using (created_by = (select auth.uid()));


-- ---- visits ---------------------------------------------------------
create policy "visits: signed-in users can read all"
  on public.visits for select to authenticated
  using (true);

create policy "visits: you can log visits as yourself"
  on public.visits for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "visits: you can edit only your own"
  on public.visits for update to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "visits: you can delete only your own"
  on public.visits for delete to authenticated
  using (user_id = (select auth.uid()));


-- ---- visit_drinks ---------------------------------------------------
-- A drink has no owner column of its own; it belongs to whoever owns its
-- visit. Each policy asks "is there a visit with this id that ...?".
-- That lookup into visits is itself filtered by the visits policies, so
-- drinks automatically follow whatever the visits rules are.
create policy "drinks: readable when the visit is readable"
  on public.visit_drinks for select to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_drinks.visit_id
  ));

create policy "drinks: add only to your own visits"
  on public.visit_drinks for insert to authenticated
  with check (exists (
    select 1 from public.visits v
    where v.id = visit_drinks.visit_id
      and v.user_id = (select auth.uid())
  ));

create policy "drinks: edit only on your own visits"
  on public.visit_drinks for update to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_drinks.visit_id
      and v.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.visits v
    where v.id = visit_drinks.visit_id
      and v.user_id = (select auth.uid())
  ));

create policy "drinks: delete only from your own visits"
  on public.visit_drinks for delete to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_drinks.visit_id
      and v.user_id = (select auth.uid())
  ));


-- ---- visit_notes (private) ------------------------------------------
-- Unlike drinks, even READING requires owning the visit. Every policy
-- asks: "is there a visit with this id whose owner is me?"
create policy "notes: only the owner can read"
  on public.visit_notes for select to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_notes.visit_id
      and v.user_id = (select auth.uid())
  ));

create policy "notes: add only to your own visits"
  on public.visit_notes for insert to authenticated
  with check (exists (
    select 1 from public.visits v
    where v.id = visit_notes.visit_id
      and v.user_id = (select auth.uid())
  ));

create policy "notes: edit only on your own visits"
  on public.visit_notes for update to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_notes.visit_id
      and v.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.visits v
    where v.id = visit_notes.visit_id
      and v.user_id = (select auth.uid())
  ));

create policy "notes: delete only from your own visits"
  on public.visit_notes for delete to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_notes.visit_id
      and v.user_id = (select auth.uid())
  ));

commit;
