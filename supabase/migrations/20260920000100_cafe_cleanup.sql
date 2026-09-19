-- =====================================================================
-- Bean Bud — remove cafes that no longer have any visits
--
-- Cafes are shared, so deleting your visit used to leave the cafe row behind,
-- still "owned" by whoever first added it. Re-adding that cafe then matched the
-- leftover row, whose address only its original creator could change.
--
-- Now, whenever a visit is deleted (or moved to a different cafe), the cafe it
-- belonged to is deleted too IF nothing else visits it.
--
-- The trigger function is "security definer" (it runs with the owner's rights)
-- because the person deleting the last visit is often NOT the person who added
-- the cafe, and the security rules would otherwise stop them from deleting it.
-- It can only ever delete a cafe with no visits, so it cannot hurt anyone's data.
-- Trigger functions cannot be called directly from the app.
-- =====================================================================
begin;

create function public.delete_orphan_cafe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.cafes c
   where c.id = old.cafe_id
     and not exists (select 1 from public.visits v where v.cafe_id = c.id);
  return null;
end;
$$;

create trigger visits_cleanup_cafe_after_delete
  after delete on public.visits
  for each row execute function public.delete_orphan_cafe();

-- Editing a visit can move it to a different cafe, which may orphan the old one.
create trigger visits_cleanup_cafe_after_move
  after update of cafe_id on public.visits
  for each row
  when (old.cafe_id is distinct from new.cafe_id)
  execute function public.delete_orphan_cafe();

-- One-time cleanup of the leftovers that already exist.
delete from public.cafes c
 where not exists (select 1 from public.visits v where v.cafe_id = c.id);

commit;
