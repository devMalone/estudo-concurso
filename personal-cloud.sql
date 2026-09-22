-- Estudo 2. Execute no projeto atual. Não altera as tabelas das outras aplicações.
begin;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists estudo_private;
revoke all on schema estudo_private from public, anon, authenticated;
create table if not exists estudo_private.workspaces (
 id uuid primary key default gen_random_uuid(), key_hash bytea not null unique,
 created_at timestamptz not null default now()
);
create table if not exists estudo_private.events (
 workspace_id uuid not null references estudo_private.workspaces(id),
 id uuid not null, entity uuid not null,
 kind text not null check(kind in ('exam','subject','topic','session','review','plan','mock')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=65536),
 at timestamptz not null, primary key(workspace_id,id)
);
alter table estudo_private.workspaces enable row level security;
alter table estudo_private.events enable row level security;
revoke all on estudo_private.workspaces, estudo_private.events from public, anon, authenticated;
create or replace function public.estudo_connect(p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare wid uuid;
begin
 if p_key is null or p_key !~ '^[a-f0-9]{64}$' then raise exception 'Chave pessoal inválida.' using errcode='28000'; end if;
 select id into wid from estudo_private.workspaces where key_hash=extensions.digest(pg_catalog.convert_to(p_key,'UTF8'),'sha256');
 if wid is null then raise exception 'Chave pessoal inválida.' using errcode='28000'; end if;
 return pg_catalog.jsonb_build_object('workspace_id',wid);
end $$;
create or replace function public.estudo_pull(p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare wid uuid; result jsonb;
begin
 wid := (public.estudo_connect(p_key)->>'workspace_id')::uuid;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x) order by x.id),'[]'::jsonb) into result
 from (select id,entity,kind,payload,at from estudo_private.events
 where workspace_id=wid order by at,id) x;
 return result;
end $$;
create or replace function public.estudo_push(p_key text,p_events jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare wid uuid; ev jsonb;
begin
 wid := (public.estudo_connect(p_key)->>'workspace_id')::uuid;
 if p_events is null or pg_catalog.jsonb_typeof(p_events)<>'array' then raise exception 'Lista inválida.'; end if;
 if pg_catalog.jsonb_array_length(p_events)>100 then raise exception 'Limite de 100 eventos.'; end if;
 for ev in select value from pg_catalog.jsonb_array_elements(p_events) loop
  insert into estudo_private.events(workspace_id,id,entity,kind,payload,at)
  values(wid,(ev->>'id')::uuid,(ev->>'entity')::uuid,ev->>'kind',ev->'payload',(ev->>'at')::timestamptz)
  on conflict (workspace_id,id) do nothing;
 end loop;
 return pg_catalog.jsonb_build_object('ok',true);
end $$;
revoke all on function public.estudo_connect(text) from public;
revoke all on function public.estudo_pull(text) from public;
revoke all on function public.estudo_push(text,jsonb) from public;
grant execute on function public.estudo_connect(text) to anon,authenticated;
grant execute on function public.estudo_pull(text) to anon,authenticated;
grant execute on function public.estudo_push(text,jsonb) to anon,authenticated;
commit;
