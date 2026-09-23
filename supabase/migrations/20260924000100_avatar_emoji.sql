-- =====================================================================
-- Bean Bud — avatars become a free emoji, not a pick from a fixed set
--
-- The app used to store a short key ('bean', 'cup', ...) that mapped to one of 8 built-in
-- glyphs; the design v2 avatar picker is just a text field for the device's own emoji
-- keyboard, and the app now renders whatever is stored directly. profiles.avatar was already
-- a free text column (see 20260919000200_profile_avatar.sql), so no schema change is needed —
-- only converting the handful of existing key values to the glyph they used to display, so
-- nobody's avatar silently turns into the literal word "bean".
-- =====================================================================
begin;

update public.profiles
   set avatar = case avatar
     when 'bean'      then '🫘'
     when 'cup'       then '☕'
     when 'leaf'      then '🌿'
     when 'croissant' then '🥐'
     when 'moon'      then '🌙'
     when 'sun'       then '☀️'
     when 'wave'      then '🌊'
     when 'star'      then '⭐'
     else avatar
   end
 where avatar in ('bean', 'cup', 'leaf', 'croissant', 'moon', 'sun', 'wave', 'star');

commit;
