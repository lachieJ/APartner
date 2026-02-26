-- ConceptType remediation helpers
-- Run in Supabase SQL Editor after reviewing outputs from:
--   db/diagnostics/concept_type_health_checks.sql
--
-- Notes
-- - This script is intentionally conservative.
-- - It includes one safe automatic fix (sibling order normalization).
-- - Cycle sections are diagnostic/guided only; they do not auto-delete data.

-- 1) Preview sibling order normalization (current vs normalized)
with ranked as (
  select
    ct.id,
    ct.name,
    ct.part_of_concept_type_id as parent_id,
    parent.name as parent_name,
    ct.part_order as current_part_order,
    row_number() over (
      partition by ct.part_of_concept_type_id
      order by ct.part_order nulls last, ct.name
    ) as normalized_part_order
  from public.concept_type ct
  join public.concept_type parent on parent.id = ct.part_of_concept_type_id
)
select
  id,
  name,
  parent_id,
  parent_name,
  current_part_order,
  normalized_part_order
from ranked
where current_part_order is distinct from normalized_part_order
order by parent_name, normalized_part_order, name;

-- 2) Apply sibling order normalization (safe, deterministic)
-- Uncomment to execute.
-- with ranked as (
--   select
--     ct.id,
--     row_number() over (
--       partition by ct.part_of_concept_type_id
--       order by ct.part_order nulls last, ct.name
--     ) as normalized_part_order
--   from public.concept_type ct
--   where ct.part_of_concept_type_id is not null
-- )
-- update public.concept_type ct
-- set part_order = ranked.normalized_part_order
-- from ranked
-- where ct.id = ranked.id
--   and ct.part_order is distinct from ranked.normalized_part_order;

-- 3) PartOf cycle cleanup candidates (manual decision support)
with recursive part_walk as (
  select
    ct.id as start_id,
    ct.id as current_id,
    ct.part_of_concept_type_id as next_id,
    array[ct.id]::uuid[] as path
  from public.concept_type ct
  where ct.part_of_concept_type_id is not null
    and ct.part_of_concept_type_id <> ct.id

  union all

  select
    pw.start_id,
    next_ct.id as current_id,
    next_ct.part_of_concept_type_id as next_id,
    pw.path || next_ct.id
  from part_walk pw
  join public.concept_type next_ct on next_ct.id = pw.next_id
  where pw.next_id is not null
    and not (next_ct.id = any(pw.path))
), part_cycles as (
  select distinct
    pw.start_id,
    pw.current_id,
    pw.next_id as cycle_entry_id
  from part_walk pw
  where pw.next_id is not null
    and pw.next_id = any(pw.path)
)
select
  pc.start_id,
  start_ct.name as start_name,
  pc.current_id as suggested_edge_from_id,
  from_ct.name as suggested_edge_from_name,
  pc.cycle_entry_id as suggested_edge_to_id,
  to_ct.name as suggested_edge_to_name,
  'Review this PartOf edge; setting suggested_edge_from.part_of_concept_type_id = null is one way to break cycle.' as guidance
from part_cycles pc
join public.concept_type start_ct on start_ct.id = pc.start_id
join public.concept_type from_ct on from_ct.id = pc.current_id
join public.concept_type to_ct on to_ct.id = pc.cycle_entry_id
order by start_name, suggested_edge_from_name;

-- 4) ReferenceTo cycle cleanup candidates (manual decision support)
with recursive ref_walk as (
  select
    ct.id as start_id,
    ct.id as current_id,
    ct.reference_to_concept_type_id as next_id,
    array[ct.id]::uuid[] as path
  from public.concept_type ct
  where ct.reference_to_concept_type_id is not null

  union all

  select
    rw.start_id,
    next_ct.id as current_id,
    next_ct.reference_to_concept_type_id as next_id,
    rw.path || next_ct.id
  from ref_walk rw
  join public.concept_type next_ct on next_ct.id = rw.next_id
  where rw.next_id is not null
    and not (next_ct.id = any(rw.path))
), ref_cycles as (
  select distinct
    rw.start_id,
    rw.current_id,
    rw.next_id as cycle_entry_id
  from ref_walk rw
  where rw.next_id is not null
    and rw.next_id = any(rw.path)
)
select
  rc.start_id,
  start_ct.name as start_name,
  rc.current_id as suggested_edge_from_id,
  from_ct.name as suggested_edge_from_name,
  rc.cycle_entry_id as suggested_edge_to_id,
  to_ct.name as suggested_edge_to_name,
  'Review this ReferenceTo edge; setting suggested_edge_from.reference_to_concept_type_id = null is one way to break cycle.' as guidance
from ref_cycles rc
join public.concept_type start_ct on start_ct.id = rc.start_id
join public.concept_type from_ct on from_ct.id = rc.current_id
join public.concept_type to_ct on to_ct.id = rc.cycle_entry_id
order by start_name, suggested_edge_from_name;

-- 5) Optional template statements for manual cycle-edge edits
-- Replace IDs after careful review.
-- update public.concept_type
-- set part_of_concept_type_id = null
-- where id = '00000000-0000-0000-0000-000000000000';
--
-- update public.concept_type
-- set reference_to_concept_type_id = null
-- where id = '00000000-0000-0000-0000-000000000000';
