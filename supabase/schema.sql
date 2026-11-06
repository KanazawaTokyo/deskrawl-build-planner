-- Deskrawl Build Planner v0.1 — independent Supabase project only.
-- Run in a NEW project, not Schedule App / Monthly Time Map.
-- This table stores a versioned JSON document per authenticated user.
create table if not exists public.planner_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now(),
  constraint planner_state_payload_type check (jsonb_typeof(payload) = 'object'),
  constraint planner_state_payload_version check (payload ? 'schemaVersion')
);
create or replace function public.planner_state_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- Not an exposed callable RPC: this trigger function is executable only by Postgres trigger.
revoke execute on function public.planner_state_touch_updated_at() from public, anon, authenticated;
drop trigger if exists planner_state_set_updated_at on public.planner_state;
create trigger planner_state_set_updated_at before update on public.planner_state
for each row execute function public.planner_state_touch_updated_at();
alter table public.planner_state enable row level security;
revoke all on table public.planner_state from public, anon;
grant select, insert, update, delete on public.planner_state to authenticated;

drop policy if exists "owner read" on public.planner_state;
create policy "owner read" on public.planner_state for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "owner insert" on public.planner_state;
create policy "owner insert" on public.planner_state for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "owner update" on public.planner_state;
create policy "owner update" on public.planner_state for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "owner delete" on public.planner_state;
create policy "owner delete" on public.planner_state for delete to authenticated
using ((select auth.uid()) = user_id);

-- Optional smoke test, run as project owner:
-- select relname, relrowsecurity from pg_class where relname='planner_state';
-- select policyname, cmd from pg_policies where schemaname='public' and tablename='planner_state';
-- select has_table_privilege('anon','public.planner_state','select');  -- should be false
-- select has_table_privilege('authenticated','public.planner_state','select'); -- true, RLS still enforced
