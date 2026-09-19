-- =====================================================================
-- Bean Bud — avatar choice on profiles
--
-- Stores which avatar someone picked as a short key (e.g. 'bean'). For now
-- the app maps keys to built-in placeholders; when the avatar library
-- exists, these keys can become ids in that table.
--
-- No policy changes needed: the existing rules already let everyone read
-- profiles and let you edit only your own row, and they cover every column.
-- =====================================================================
begin;

alter table public.profiles
  add column avatar text check (avatar is null or char_length(avatar) between 1 and 40);

commit;
