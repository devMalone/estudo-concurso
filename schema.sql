-- Execute uma vez no SQL Editor do seu projeto Supabase.
-- Eventos imutáveis: reenvios não duplicam sessões. Exclusões são novos eventos.
create table if not exists public.study_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  kind text not null check (kind in ('exam','subject','topic','session','review','plan','mock')),
  entity uuid not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536),
  at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(user_id,id)
);
alter table public.study_events enable row level security;
revoke all on public.study_events from anon, authenticated;
grant select, insert on public.study_events to authenticated;
drop policy if exists "Read own events" on public.study_events;
create policy "Read own events" on public.study_events for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own events" on public.study_events;
create policy "Insert own events" on public.study_events for insert to authenticated with check ((select auth.uid()) = user_id);
create index if not exists study_events_owner_date on public.study_events(user_id,at);
