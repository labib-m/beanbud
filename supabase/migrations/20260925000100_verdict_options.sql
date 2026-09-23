-- =====================================================================
-- Bean Bud — two more verdict options: "Regular" and "Okay for Desperate Caffeine"
--
-- visits.verdict has a check constraint naming the allowed values (see
-- 20260919000000_initial_schema.sql), so adding a new one needs a migration, not just an
-- app-side change. Postgres auto-names an inline column check "<table>_<column>_check".
-- =====================================================================
begin;

alter table public.visits drop constraint visits_verdict_check;
alter table public.visits add constraint visits_verdict_check
  check (verdict in ('regular', 'return', 'once', 'plain', 'desperate'));

commit;
