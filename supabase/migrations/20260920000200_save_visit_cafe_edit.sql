-- =====================================================================
-- Bean Bud — cafe address / map link: who can set them
--
--   * A BLANK address or map link can be filled in by anyone signed in.
--   * An address / map link that already exists can only be changed by the person
--     who added the cafe.
--
-- Replaces save_visit() from 20260919000100_save_visit.sql. The only change is the
-- two address steps in "1. Find the cafe" below. Everything else is identical, and
-- the existing permissions on the function are kept.
-- =====================================================================
begin;

-- Fills in blanks only, and never overwrites. It is "security definer" (runs with the owner's
-- rights) so a person who did NOT add the cafe can still complete a missing address; the rules
-- on the cafes table would otherwise stop them. Because it only ever writes into empty fields,
-- it cannot be used to change or remove anything that is already saved.
create function public.fill_cafe_blanks(p_cafe_id uuid, p_address text, p_map_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;   -- logged-out callers do nothing
  end if;
  update public.cafes
     set address = coalesce(nullif(address, ''), nullif(btrim(p_address), '')),
         map_url = coalesce(nullif(map_url, ''), nullif(btrim(p_map_url), ''))
   where id = p_cafe_id
     and (coalesce(address, '') = '' or coalesce(map_url, '') = '');
end;
$$;

revoke execute on function public.fill_cafe_blanks(uuid, text, text) from public, anon;
grant  execute on function public.fill_cafe_blanks(uuid, text, text) to authenticated;

create or replace function public.save_visit(
  p_cafe     jsonb,             -- {name, city, area, address, map_url}
  p_visit    jsonb,             -- visit columns, see below
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
  v_visit   uuid;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  -- 1. Find the cafe, or create it. Identity = name|city|area, the same
  --    rule the cafes table uses for its cafe_key column.
  v_key :=
      lower(regexp_replace(btrim(p_cafe->>'name'), '\s+', ' ', 'g')) || '|' ||
      lower(regexp_replace(btrim(p_cafe->>'city'), '\s+', ' ', 'g')) || '|' ||
      lower(regexp_replace(btrim(coalesce(p_cafe->>'area', '')), '\s+', ' ', 'g'));

  select id into v_cafe_id from public.cafes where cafe_key = v_key;
  if v_cafe_id is null then
    insert into public.cafes (name, city, area, address, map_url)
    values (
      p_cafe->>'name',
      p_cafe->>'city',
      coalesce(p_cafe->>'area', ''),
      nullif(p_cafe->>'address', ''),
      nullif(p_cafe->>'map_url', '')
    )
    on conflict (cafe_key) do nothing
    returning id into v_cafe_id;
    -- Someone else may have created it a moment ago; look again.
    if v_cafe_id is null then
      select id into v_cafe_id from public.cafes where cafe_key = v_key;
    end if;
  end if;

  -- The person who ADDED this cafe may correct its address and map link. Only non-empty values
  -- are applied, so an empty box can never wipe what is saved.
  update public.cafes
     set address = coalesce(nullif(p_cafe->>'address', ''), address),
         map_url = coalesce(nullif(p_cafe->>'map_url', ''), map_url)
   where id = v_cafe_id
     and created_by = v_uid;

  -- Anyone may complete a blank address or map link (never overwriting one that exists).
  perform public.fill_cafe_blanks(v_cafe_id, p_cafe->>'address', p_cafe->>'map_url');

  -- 2. The visit itself.
  if p_visit_id is null then
    insert into public.visits (
      cafe_id, visited_on,
      score_ambiance, score_drinks, score_food, score_service, score_crowd,
      verdict, currency, price_band, spend,
      opens, closes, hours_note, parking, parking_note, area_note,
      good_for, amenities
    ) values (
      v_cafe_id, (p_visit->>'visited_on')::date,
      (p_visit->>'score_ambiance')::smallint, (p_visit->>'score_drinks')::smallint,
      (p_visit->>'score_food')::smallint, (p_visit->>'score_service')::smallint,
      (p_visit->>'score_crowd')::smallint,
      nullif(p_visit->>'verdict', ''), nullif(p_visit->>'currency', ''),
      (p_visit->>'price_band')::smallint, nullif(p_visit->>'spend', ''),
      nullif(p_visit->>'opens', '')::time, nullif(p_visit->>'closes', '')::time,
      nullif(p_visit->>'hours_note', ''), nullif(p_visit->>'parking', ''),
      nullif(p_visit->>'parking_note', ''), nullif(p_visit->>'area_note', ''),
      coalesce(array(select jsonb_array_elements_text(p_visit->'good_for')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_visit->'amenities')), '{}')
    )
    returning id into v_visit;
  else
    update public.visits set
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
      amenities = coalesce(array(select jsonb_array_elements_text(p_visit->'amenities')), '{}')
    where id = p_visit_id
    returning id into v_visit;

    -- An update the policies block changes 0 rows without an error.
    -- Turn that silent failure into a loud one.
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

-- Only logged-in users may call it (functions are callable by everyone
-- by default, so take that away first).
revoke execute on function public.save_visit(jsonb, jsonb, jsonb, text, uuid) from public, anon;
grant  execute on function public.save_visit(jsonb, jsonb, jsonb, text, uuid) to authenticated;

commit;
