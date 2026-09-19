-- =====================================================================
-- Bean Bud — the shared cafe directory, cafe pages and page history
--
--   * EVERY cafe is in the directory and has its own page from the moment it is created.
--   * A new cafe cannot be created without an address and a map link.
--   * Anyone signed in can edit a cafe's address and map link ("Edit cafe"). Both must stay filled in.
--   * EVERY change is recorded (who, when, old and new value), Wikipedia-style. A trigger does
--     this, so no code path can forget or skip it.
--   * A visit remembers which version of the cafe's details it was logged under, so editing a
--     cafe never rewrites anyone's past entries; new visits use the newest version.
--   * Visits get an optional PUBLIC note (the private note stays private, in its own table).
--   * Cafes are never deleted when their visits are: the directory grows from contributions.
--   * Every cafe gets a short, readable, permanent CODE: NAME_CITY_AREA, e.g. DOSE_DHA_BAN.
--
-- Replaces save_visit(). Removes the empty-cafe cleanup (20260920000100) and fill_cafe_blanks()
-- (20260920000200), which existed to work around locked addresses. That problem no longer exists.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. cafe codes: NAME_CITY_AREA, e.g. DOSE_DHA_BAN
-- ---------------------------------------------------------------------
-- The first part (up to 4 letters/digits of the name) is the "unique code": if another cafe in the same
-- city and neighbourhood would get the same code, it gets a number (DOSE2_DHA_BAN), so codes never repeat.
-- A part with nothing usable in it (for example a name in another script) falls back to CAFE / XXX.
-- The code is set once when the cafe is created and never changes, so it is safe to reference.
alter table public.cafes add column code text;

create function public.make_cafe_code(p_name text, p_city text, p_area text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_name text := coalesce(nullif(left(regexp_replace(upper(coalesce(p_name, '')), '[^A-Z0-9]', '', 'g'), 4), ''), 'CAFE');
  v_city text := coalesce(nullif(left(regexp_replace(upper(coalesce(p_city, '')), '[^A-Z0-9]', '', 'g'), 3), ''), 'XXX');
  v_area text := coalesce(nullif(left(regexp_replace(upper(coalesce(p_area, '')), '[^A-Z0-9]', '', 'g'), 3), ''), 'XXX');
  v_n    int  := 1;
  v_code text;
begin
  loop
    v_code := v_name || case when v_n > 1 then v_n::text else '' end || '_' || v_city || '_' || v_area;
    exit when not exists (select 1 from public.cafes where code = v_code);
    v_n := v_n + 1;
  end loop;
  return v_code;
end;
$$;

-- Give every cafe that exists today a code, oldest first (one at a time, so each sees the codes before it).
do $$
declare
  c record;
begin
  for c in select id, name, city, area from public.cafes order by created_at, id loop
    update public.cafes set code = public.make_cafe_code(c.name, c.city, c.area) where id = c.id;
  end loop;
end
$$;

alter table public.cafes alter column code set not null;
create unique index cafes_code_key on public.cafes (code);

create function public.cafes_assign_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.code := public.make_cafe_code(new.name, new.city, new.area);
  return new;
end;
$$;

create trigger cafes_assign_code_before_insert
  before insert on public.cafes
  for each row execute function public.cafes_assign_code();


-- ---------------------------------------------------------------------
-- 2. cafe_revisions: the page history
-- ---------------------------------------------------------------------
create table public.cafe_revisions (
  id           uuid primary key default gen_random_uuid(),
  cafe_id      uuid not null references public.cafes (id) on delete cascade,
  kind         text not null check (kind in ('created', 'edited')),
  address      text,                       -- the values AS OF this revision
  map_url      text,
  prev_address text,                       -- what they were before (edits only)
  prev_map_url text,
  changed_by   uuid references public.profiles (id) on delete set null,   -- null = the developer, via SQL
  -- clock_timestamp(), not now(): two revisions made in one transaction must still sort in order.
  changed_at   timestamptz not null default clock_timestamp()
);

create index cafe_revisions_cafe_idx on public.cafe_revisions (cafe_id, changed_at desc);

-- Give every cafe that exists today a first revision, so history is never empty.
insert into public.cafe_revisions (cafe_id, kind, address, map_url, changed_by, changed_at)
select id, 'created', address, map_url, created_by, created_at from public.cafes;


-- ---------------------------------------------------------------------
-- 3. visits: remember the cafe version, and an optional public note
-- ---------------------------------------------------------------------
alter table public.visits
  add column cafe_revision_id uuid references public.cafe_revisions (id) on delete set null,
  add column public_note text check (char_length(public_note) <= 1000);

update public.visits v
   set cafe_revision_id = (
     select r.id from public.cafe_revisions r
      where r.cafe_id = v.cafe_id
      order by r.changed_at asc, r.id asc limit 1
   );


-- ---------------------------------------------------------------------
-- 4. The recorder: a trigger writes the history, so nothing can skip it
-- ---------------------------------------------------------------------
-- "security definer" because clients have no right to write revisions directly (below);
-- only this trigger does. auth.uid() is still the person who made the change.
create function public.cafes_record_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.cafe_revisions (cafe_id, kind, address, map_url, changed_by, changed_at)
    values (new.id, 'created', new.address, new.map_url, coalesce(auth.uid(), new.created_by), clock_timestamp());
  elsif new.address is distinct from old.address or new.map_url is distinct from old.map_url then
    insert into public.cafe_revisions (cafe_id, kind, address, map_url, prev_address, prev_map_url, changed_by, changed_at)
    values (new.id, 'edited', new.address, new.map_url, old.address, old.map_url, auth.uid(), clock_timestamp());
  end if;
  return null;
end;
$$;

create trigger cafes_revision_after_insert
  after insert on public.cafes
  for each row execute function public.cafes_record_revision();

create trigger cafes_revision_after_update
  after update of address, map_url on public.cafes
  for each row execute function public.cafes_record_revision();


-- A cafe must have an address and a map link. NOT VALID means "enforce this for every new or changed
-- row, but do not reject the rows that already exist" (some older test cafes have neither). Anyone
-- can complete such a cafe with "Edit cafe".
alter table public.cafes
  add constraint cafes_have_details
  check (nullif(btrim(address), '') is not null and nullif(btrim(map_url), '') is not null)
  not valid;


-- ---------------------------------------------------------------------
-- 5. Who can do what
-- ---------------------------------------------------------------------
alter table public.cafe_revisions enable row level security;
revoke all on public.cafe_revisions from anon, authenticated;
grant select on public.cafe_revisions to authenticated;

create policy "revisions: signed-in users can read all"
  on public.cafe_revisions for select to authenticated
  using (true);
-- No insert / update / delete policy or grant: only the trigger above writes history.

-- Cafes are shared by everyone, so clients never change or delete them directly:
--   * creating one happens only inside save_visit() (which requires an address and a map link);
--   * changing one happens only through edit_cafe() (so it always lands in the history);
--   * nobody deletes one.
drop policy "cafes: you can edit only cafes you added" on public.cafes;
drop policy "cafes: you can delete only cafes you added" on public.cafes;
revoke insert, update, delete on public.cafes from authenticated;
grant insert (name, city, area, address, map_url, created_by) on public.cafes to authenticated;


-- ---------------------------------------------------------------------
-- 6. Remove what is no longer needed
-- ---------------------------------------------------------------------
drop trigger if exists visits_cleanup_cafe_after_delete on public.visits;
drop trigger if exists visits_cleanup_cafe_after_move   on public.visits;
drop function if exists public.delete_orphan_cafe();
drop function if exists public.fill_cafe_blanks(uuid, text, text);


-- ---------------------------------------------------------------------
-- 7. edit_cafe(): anyone signed in may edit a cafe's address and map link
-- ---------------------------------------------------------------------
-- Both must be filled in. Runs with the owner's rights because clients cannot update cafes
-- directly; the change is recorded by the trigger, under the caller's name.
create function public.edit_cafe(p_cafe_id uuid, p_address text, p_map_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if nullif(btrim(p_address), '') is null or nullif(btrim(p_map_url), '') is null then
    raise exception 'a cafe needs both an address and a map link' using errcode = '22023';
  end if;
  update public.cafes
     set address = btrim(p_address),
         map_url = btrim(p_map_url)
   where id = p_cafe_id;
  if not found then
    raise exception 'that cafe was not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.edit_cafe(uuid, text, text) from public, anon;
grant  execute on function public.edit_cafe(uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 8. save_visit(): a NEW cafe needs an address and map link; snapshot the cafe version; public note
-- ---------------------------------------------------------------------
create or replace function public.save_visit(
  p_cafe     jsonb,             -- {name, city, area, address, map_url}
  p_visit    jsonb,             -- visit columns
  p_drinks   jsonb default '[]',-- [{drink_type, price, score}, ...] in order
  p_notes    text  default null,-- private note; empty/null removes it
  p_visit_id uuid  default null -- null = new visit, otherwise edit this one
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_key     text;
  v_cafe_id uuid;
  v_rev     uuid;
  v_visit   uuid;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  -- 1. Find the cafe, or create it. Identity = name|city|area.
  v_key :=
      lower(regexp_replace(btrim(p_cafe->>'name'), '\s+', ' ', 'g')) || '|' ||
      lower(regexp_replace(btrim(p_cafe->>'city'), '\s+', ' ', 'g')) || '|' ||
      lower(regexp_replace(btrim(coalesce(p_cafe->>'area', '')), '\s+', ' ', 'g'));

  select id into v_cafe_id from public.cafes where cafe_key = v_key;
  if v_cafe_id is null then
    -- A new cafe goes into the shared directory, so it must arrive with an address and a map link.
    if nullif(btrim(p_cafe->>'address'), '') is null or nullif(btrim(p_cafe->>'map_url'), '') is null then
      raise exception 'a new cafe needs an address and a map link' using errcode = '22023';
    end if;
    insert into public.cafes (name, city, area, address, map_url)
    values (
      p_cafe->>'name',
      p_cafe->>'city',
      coalesce(p_cafe->>'area', ''),
      btrim(p_cafe->>'address'),
      btrim(p_cafe->>'map_url')
    )
    on conflict (cafe_key) do nothing
    returning id into v_cafe_id;
    -- Someone else may have created it a moment ago; use theirs.
    if v_cafe_id is null then
      select id into v_cafe_id from public.cafes where cafe_key = v_key;
    end if;
  end if;
  -- An EXISTING cafe's address and map link are never taken from a visit: change them with edit_cafe().

  -- The version of the cafe's details this visit is logged under: the newest one right now.
  select id into v_rev from public.cafe_revisions
   where cafe_id = v_cafe_id
   order by changed_at desc, id desc
   limit 1;

  -- 2. The visit itself.
  if p_visit_id is null then
    insert into public.visits (
      cafe_id, cafe_revision_id, visited_on,
      score_ambiance, score_drinks, score_food, score_service, score_crowd,
      verdict, currency, price_band, spend,
      opens, closes, hours_note, parking, parking_note, area_note,
      good_for, amenities, public_note
    ) values (
      v_cafe_id, v_rev, (p_visit->>'visited_on')::date,
      (p_visit->>'score_ambiance')::smallint, (p_visit->>'score_drinks')::smallint,
      (p_visit->>'score_food')::smallint, (p_visit->>'score_service')::smallint,
      (p_visit->>'score_crowd')::smallint,
      nullif(p_visit->>'verdict', ''), nullif(p_visit->>'currency', ''),
      (p_visit->>'price_band')::smallint, nullif(p_visit->>'spend', ''),
      nullif(p_visit->>'opens', '')::time, nullif(p_visit->>'closes', '')::time,
      nullif(p_visit->>'hours_note', ''), nullif(p_visit->>'parking', ''),
      nullif(p_visit->>'parking_note', ''), nullif(p_visit->>'area_note', ''),
      coalesce(array(select jsonb_array_elements_text(p_visit->'good_for')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_visit->'amenities')), '{}'),
      nullif(btrim(p_visit->>'public_note'), '')
    )
    returning id into v_visit;
  else
    update public.visits set
      -- editing a visit keeps the cafe version it was logged under, unless the visit moved to a different cafe
      cafe_revision_id = case when cafe_id is distinct from v_cafe_id then v_rev else cafe_revision_id end,
      cafe_id = v_cafe_id,
      visited_on = (p_visit->>'visited_on')::date,
      score_ambiance = (p_visit->>'score_ambiance')::smallint,
      score_drinks   = (p_visit->>'score_drinks')::smallint,
      score_food     = (p_visit->>'score_food')::smallint,
      score_service  = (p_visit->>'score_service')::smallint,
      score_crowd    = (p_visit->>'score_crowd')::smallint,
      verdict = nullif(p_visit->>'verdict', ''),
      currency = nullif(p_visit->>'currency', ''),
      price_band = (p_visit->>'price_band')::smallint,
      spend = nullif(p_visit->>'spend', ''),
      opens = nullif(p_visit->>'opens', '')::time,
      closes = nullif(p_visit->>'closes', '')::time,
      hours_note = nullif(p_visit->>'hours_note', ''),
      parking = nullif(p_visit->>'parking', ''),
      parking_note = nullif(p_visit->>'parking_note', ''),
      area_note = nullif(p_visit->>'area_note', ''),
      good_for  = coalesce(array(select jsonb_array_elements_text(p_visit->'good_for')), '{}'),
      amenities = coalesce(array(select jsonb_array_elements_text(p_visit->'amenities')), '{}'),
      public_note = nullif(btrim(p_visit->>'public_note'), '')
    where id = p_visit_id
    returning id into v_visit;

    -- An update the policies block changes 0 rows without an error. Make that loud.
    if v_visit is null then
      raise exception 'visit not found, or it is not yours' using errcode = '42501';
    end if;
  end if;

  -- 3. Drinks: replace the whole list.
  delete from public.visit_drinks where visit_id = v_visit;
  insert into public.visit_drinks (visit_id, drink_type, price, score, sort_order)
  select v_visit,
         d->>'drink_type',
         (d->>'price')::numeric,
         (d->>'score')::smallint,
         (o - 1)::smallint
  from jsonb_array_elements(coalesce(p_drinks, '[]'::jsonb)) with ordinality as t(d, o);

  -- 4. Private note: save it, or remove it if blank.
  if p_notes is null or btrim(p_notes) = '' then
    delete from public.visit_notes where visit_id = v_visit;
  else
    insert into public.visit_notes (visit_id, notes) values (v_visit, p_notes)
    on conflict (visit_id) do update set notes = excluded.notes;
  end if;

  return v_visit;
end;
$$;

commit;
