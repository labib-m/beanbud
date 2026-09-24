-- =====================================================================
-- Bean Bud — reactions on logs: one reaction per person per visit, chosen from
-- love / question / dislike. Everyone signed in can see them (so counts show);
-- you can only add, change or remove your own. Safe to run once, in the
-- Supabase SQL editor.
-- =====================================================================
begin;

create table public.reactions (
  visit_id   uuid not null references public.visits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('love', 'question', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (visit_id, user_id)
);
create index reactions_user_idx on public.reactions (user_id);

alter table public.reactions enable row level security;
revoke all on public.reactions from anon, authenticated;
grant select, insert, update (kind), delete on public.reactions to authenticated;

create policy "reactions: everyone signed in can read"
  on public.reactions for select to authenticated using (true);

create policy "reactions: you can add only as yourself"
  on public.reactions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "reactions: you can change only your own"
  on public.reactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "reactions: you can remove only your own"
  on public.reactions for delete to authenticated
  using (user_id = (select auth.uid()));

commit;
