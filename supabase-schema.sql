create table if not exists public.quiz_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.quiz_state enable row level security;

revoke all on table public.quiz_state from anon;
grant select, insert, update, delete on table public.quiz_state to authenticated;

drop policy if exists "Users read their quiz state" on public.quiz_state;
create policy "Users read their quiz state"
on public.quiz_state for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their quiz state" on public.quiz_state;
create policy "Users insert their quiz state"
on public.quiz_state for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their quiz state" on public.quiz_state;
create policy "Users update their quiz state"
on public.quiz_state for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their quiz state" on public.quiz_state;
create policy "Users delete their quiz state"
on public.quiz_state for delete to authenticated
using ((select auth.uid()) = user_id);
