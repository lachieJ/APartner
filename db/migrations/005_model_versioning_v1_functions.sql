-- Model Versioning V1 functions (draft)
--
-- Adds executable RPC helpers behind feature flag `model_versioning_v1`.
-- These functions snapshot and restore current `concept_type` state.

-- Backward-safe schema fix if migration 004 was applied before draft adjustments.
alter table if exists public.model_version_item
  drop constraint if exists model_version_item_concept_type_id_fkey;

alter table if exists public.model_version_item
  add column if not exists part_order integer;

create or replace function public.model_versioning_commit_snapshot(
  p_workspace_id uuid,
  p_filename text,
  p_reason text,
  p_source public.model_version_source default 'import',
  p_parent_version_id uuid default null,
  p_change_summary jsonb default null,
  p_file_hash text default null
)
returns table (
  version_id uuid,
  version_no integer,
  parent_version_id uuid,
  source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
  v_version_no integer;
  v_parent_version_id uuid;
  v_actor_id uuid;
begin
  if not public.is_feature_enabled('model_versioning_v1') then
    raise exception 'Model versioning is disabled.';
  end if;

  if p_workspace_id is null then
    raise exception 'workspaceId is required.';
  end if;

  if p_filename is null or length(btrim(p_filename)) = 0 then
    raise exception 'filename is required.';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'reason is required.';
  end if;

  v_actor_id := coalesce(auth.uid(), gen_random_uuid());
  v_version_no := public.next_model_version_no(p_workspace_id);
  v_parent_version_id := p_parent_version_id;

  if v_parent_version_id is null then
    select mh.current_version_id
      into v_parent_version_id
    from public.model_head mh
    where mh.workspace_id = p_workspace_id;
  end if;

  insert into public.model_version (
    workspace_id,
    version_no,
    parent_version_id,
    source,
    filename,
    reason,
    change_summary,
    file_hash,
    created_by
  )
  values (
    p_workspace_id,
    v_version_no,
    v_parent_version_id,
    p_source,
    btrim(p_filename),
    btrim(p_reason),
    p_change_summary,
    nullif(btrim(coalesce(p_file_hash, '')), ''),
    v_actor_id
  )
  returning id into v_version_id;

  insert into public.model_version_item (
    model_version_id,
    stable_key,
    concept_type_id,
    name,
    description,
    part_order,
    part_of_stable_key,
    reference_to_stable_key
  )
  select
    v_version_id,
    ct.id::text,
    ct.id,
    ct.name,
    ct.description,
    ct.part_order,
    ct.part_of_concept_type_id::text,
    ct.reference_to_concept_type_id::text
  from public.concept_type ct;

  insert into public.model_head (workspace_id, current_version_id, updated_by)
  values (p_workspace_id, v_version_id, v_actor_id)
  on conflict (workspace_id)
  do update set
    current_version_id = excluded.current_version_id,
    updated_by = excluded.updated_by,
    updated_at = now();

  return query
  select v_version_id, v_version_no, v_parent_version_id, p_source::text;
end;
$$;

create or replace function public.model_versioning_rollback_to_version(
  p_workspace_id uuid,
  p_target_version_id uuid,
  p_filename text,
  p_reason text,
  p_change_summary jsonb default null
)
returns table (
  version_id uuid,
  version_no integer,
  parent_version_id uuid,
  source text,
  restored_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_version_id uuid;
  v_version_no integer;
  v_target_exists boolean;
  v_restored_count integer;
begin
  if not public.is_feature_enabled('model_versioning_v1') then
    raise exception 'Model versioning is disabled.';
  end if;

  if p_workspace_id is null then
    raise exception 'workspaceId is required.';
  end if;

  if p_target_version_id is null then
    raise exception 'targetVersionId is required.';
  end if;

  if p_filename is null or length(btrim(p_filename)) = 0 then
    raise exception 'filename is required.';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'reason is required.';
  end if;

  select exists (
    select 1
    from public.model_version mv
    where mv.id = p_target_version_id
      and mv.workspace_id = p_workspace_id
  )
  into v_target_exists;

  if not v_target_exists then
    raise exception 'Target version % not found for workspace %.', p_target_version_id, p_workspace_id;
  end if;

  v_actor_id := coalesce(auth.uid(), gen_random_uuid());
  v_version_no := public.next_model_version_no(p_workspace_id);

  insert into public.model_version (
    workspace_id,
    version_no,
    parent_version_id,
    source,
    filename,
    reason,
    change_summary,
    file_hash,
    created_by
  )
  values (
    p_workspace_id,
    v_version_no,
    p_target_version_id,
    'rollback',
    btrim(p_filename),
    btrim(p_reason),
    p_change_summary,
    null,
    v_actor_id
  )
  returning id into v_version_id;

  insert into public.model_version_item (
    model_version_id,
    stable_key,
    concept_type_id,
    name,
    description,
    part_order,
    part_of_stable_key,
    reference_to_stable_key
  )
  select
    v_version_id,
    mvi.stable_key,
    mvi.concept_type_id,
    mvi.name,
    mvi.description,
    mvi.part_order,
    mvi.part_of_stable_key,
    mvi.reference_to_stable_key
  from public.model_version_item mvi
  where mvi.model_version_id = p_target_version_id;

  -- Restore snapshot into current concept_type set.
  delete from public.concept_type;

  insert into public.concept_type (
    id,
    name,
    description,
    part_order,
    part_of_concept_type_id,
    reference_to_concept_type_id
  )
  select
    mvi.concept_type_id,
    mvi.name,
    mvi.description,
    mvi.part_order,
    null,
    null
  from public.model_version_item mvi
  where mvi.model_version_id = p_target_version_id;

  update public.concept_type ct
  set
    part_of_concept_type_id = nullif(src.part_of_stable_key, '')::uuid,
    reference_to_concept_type_id = nullif(src.reference_to_stable_key, '')::uuid
  from (
    select
      mvi.concept_type_id,
      coalesce(mvi.part_of_stable_key, '') as part_of_stable_key,
      coalesce(mvi.reference_to_stable_key, '') as reference_to_stable_key
    from public.model_version_item mvi
    where mvi.model_version_id = p_target_version_id
  ) src
  where ct.id = src.concept_type_id;

  select count(*) into v_restored_count
  from public.model_version_item mvi
  where mvi.model_version_id = p_target_version_id;

  insert into public.model_head (workspace_id, current_version_id, updated_by)
  values (p_workspace_id, v_version_id, v_actor_id)
  on conflict (workspace_id)
  do update set
    current_version_id = excluded.current_version_id,
    updated_by = excluded.updated_by,
    updated_at = now();

  return query
  select v_version_id, v_version_no, p_target_version_id, 'rollback'::text, v_restored_count;
end;
$$;
