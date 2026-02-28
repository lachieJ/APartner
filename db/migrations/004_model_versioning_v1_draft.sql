-- Model Versioning V1 (draft)
--
-- Intent:
-- - Provide immutable snapshot versioning primitives for model imports and rollback.
-- - Keep runtime behavior unchanged until explicitly enabled by feature flag.
--
-- Notes:
-- - This migration only creates schema and helper artifacts.
-- - Existing ConceptType flows are unaffected unless application code opts in.

create extension if not exists pgcrypto;

-- Optional shared feature flag table used for controlled rollout.
create table if not exists public.app_feature_flag (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_feature_flag (key, enabled, description)
values (
  'model_versioning_v1',
  false,
  'Enable model import versioning (preview/commit/rollback)'
)
on conflict (key) do nothing;

-- Version source enum for audit readability.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'model_version_source'
      and n.nspname = 'public'
  ) then
    create type public.model_version_source as enum ('import', 'rollback', 'manual');
  end if;
end $$;

create table if not exists public.model_version (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  version_no integer not null check (version_no >= 1),
  parent_version_id uuid references public.model_version(id),
  source public.model_version_source not null,
  filename text not null,
  reason text not null,
  change_summary jsonb,
  file_hash text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint uq_model_version_workspace_version unique (workspace_id, version_no),
  constraint chk_model_version_filename_nonblank check (length(btrim(filename)) > 0),
  constraint chk_model_version_reason_nonblank check (length(btrim(reason)) > 0)
);

create index if not exists ix_model_version_workspace_created
  on public.model_version (workspace_id, created_at desc);

create index if not exists ix_model_version_parent
  on public.model_version (parent_version_id);

create table if not exists public.model_version_item (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.model_version(id) on delete cascade,
  stable_key text not null,
  concept_type_id uuid not null,
  name text not null,
  description text,
  part_order integer,
  part_of_stable_key text,
  reference_to_stable_key text,
  constraint uq_model_version_item_key unique (model_version_id, stable_key),
  constraint chk_model_version_item_name_nonblank check (length(btrim(name)) > 0),
  constraint chk_model_version_item_key_nonblank check (length(btrim(stable_key)) > 0)
);

create index if not exists ix_model_version_item_version
  on public.model_version_item (model_version_id);

create index if not exists ix_model_version_item_concept_type
  on public.model_version_item (concept_type_id);

create table if not exists public.model_head (
  workspace_id uuid primary key,
  current_version_id uuid not null references public.model_version(id),
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);

-- Keep model_head timestamp fresh.
create or replace function public.model_head_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_model_head_set_updated_at on public.model_head;
create trigger trg_model_head_set_updated_at
before update on public.model_head
for each row
execute function public.model_head_set_updated_at();

-- Helper: allocate next version number inside transaction.
create or replace function public.next_model_version_no(p_workspace_id uuid)
returns integer
language sql
as $$
  select coalesce(max(mv.version_no), 0) + 1
  from public.model_version mv
  where mv.workspace_id = p_workspace_id;
$$;

-- Optional helper for app code to check rollout state.
create or replace function public.is_feature_enabled(p_key text)
returns boolean
language sql
stable
as $$
  select coalesce((select aff.enabled from public.app_feature_flag aff where aff.key = p_key), false);
$$;

-- Security posture mirrors existing MVP baseline: authenticated users can read/write.
alter table public.model_version enable row level security;
alter table public.model_version_item enable row level security;
alter table public.model_head enable row level security;

drop policy if exists model_version_authenticated_select on public.model_version;
create policy model_version_authenticated_select
on public.model_version
for select
to authenticated
using (true);

drop policy if exists model_version_authenticated_insert on public.model_version;
create policy model_version_authenticated_insert
on public.model_version
for insert
to authenticated
with check (true);

drop policy if exists model_version_authenticated_update on public.model_version;
create policy model_version_authenticated_update
on public.model_version
for update
to authenticated
using (true)
with check (true);

drop policy if exists model_version_authenticated_delete on public.model_version;
create policy model_version_authenticated_delete
on public.model_version
for delete
to authenticated
using (true);

drop policy if exists model_version_item_authenticated_select on public.model_version_item;
create policy model_version_item_authenticated_select
on public.model_version_item
for select
to authenticated
using (true);

drop policy if exists model_version_item_authenticated_insert on public.model_version_item;
create policy model_version_item_authenticated_insert
on public.model_version_item
for insert
to authenticated
with check (true);

drop policy if exists model_version_item_authenticated_update on public.model_version_item;
create policy model_version_item_authenticated_update
on public.model_version_item
for update
to authenticated
using (true)
with check (true);

drop policy if exists model_version_item_authenticated_delete on public.model_version_item;
create policy model_version_item_authenticated_delete
on public.model_version_item
for delete
to authenticated
using (true);

drop policy if exists model_head_authenticated_select on public.model_head;
create policy model_head_authenticated_select
on public.model_head
for select
to authenticated
using (true);

drop policy if exists model_head_authenticated_insert on public.model_head;
create policy model_head_authenticated_insert
on public.model_head
for insert
to authenticated
with check (true);

drop policy if exists model_head_authenticated_update on public.model_head;
create policy model_head_authenticated_update
on public.model_head
for update
to authenticated
using (true)
with check (true);

drop policy if exists model_head_authenticated_delete on public.model_head;
create policy model_head_authenticated_delete
on public.model_head
for delete
to authenticated
using (true);
