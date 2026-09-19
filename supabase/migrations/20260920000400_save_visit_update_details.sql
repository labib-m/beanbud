-- =====================================================================
-- Bean Bud — save_visit(): a confirmed correction to an existing cafe's details
--
-- Replaces save_visit() from 20260920000300_cafe_directory.sql. The only change is the block
-- headed "An EXISTING cafe's address and map link are pre-filled...". Everything else is identical,
-- and the existing permissions on the function are kept.
-- =====================================================================
begin;

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
  v_existing boolean;
  v_old_addr text;
  v_old_map  text;
  v_new_addr text;
  v_new_map  text;
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
  v_existing := v_cafe_id is not null;
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
  -- An EXISTING cafe's address and map link are pre-filled in the visit form and the person may correct them
  -- there, but only when the app says they CONFIRMED the change ("update_details": true). Otherwise nothing
  -- about the cafe changes. A blank box never erases what is saved (the saved value is kept), and both values
  -- must end up filled in. The change goes through edit_cafe(), so it lands in the cafe's page history under
  -- the person's name, and this visit is logged under the updated version.
  if v_existing and coalesce((p_cafe->>'update_details')::boolean, false) then
    select address, map_url into v_old_addr, v_old_map from public.cafes where id = v_cafe_id;
    v_new_addr := coalesce(nullif(btrim(p_cafe->>'address'), ''), v_old_addr);
    v_new_map  := coalesce(nullif(btrim(p_cafe->>'map_url'), ''), v_old_map);
    if nullif(btrim(v_new_addr), '') is not null
       and nullif(btrim(v_new_map), '') is not null
       and (v_new_addr is distinct from v_old_addr or v_new_map is distinct from v_old_map) then
      perform public.edit_cafe(v_cafe_id, v_new_addr, v_new_map);
    end if;
  end if;

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
