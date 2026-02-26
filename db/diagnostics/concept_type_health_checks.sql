-- ConceptType health checks
-- Run in Supabase SQL Editor to detect data issues before import/update operations.
-- This script centralizes anomaly logic in reusable temp views so detailed outputs
-- and summary counts stay consistent.

drop view if exists pg_temp.concept_type_orphan_partof;
drop view if exists pg_temp.concept_type_broken_refto;
drop view if exists pg_temp.concept_type_partof_cycles;
drop view if exists pg_temp.concept_type_refto_cycles;
drop view if exists pg_temp.concept_type_sibling_order_anomalies;

create view pg_temp.concept_type_orphan_partof as
select
  ct.id,
  ct.name,
  ct.part_of_concept_type_id as missing_part_of_id
from public.concept_type ct
left join public.concept_type parent on parent.id = ct.part_of_concept_type_id
where ct.part_of_concept_type_id is not null
  and parent.id is null;

create view pg_temp.concept_type_broken_refto as
select
  ct.id,
  ct.name,
  ct.reference_to_concept_type_id as missing_reference_to_id
from public.concept_type ct
left join public.concept_type target on target.id = ct.reference_to_concept_type_id
where ct.reference_to_concept_type_id is not null
  and target.id is null;

create view pg_temp.concept_type_partof_cycles as
with recursive part_walk as (
  select
    ct.id as start_id,
    ct.id as current_id,
    ct.part_of_concept_type_id as next_id,
    array[ct.id]::uuid[] as visited
  from public.concept_type ct
  where ct.part_of_concept_type_id is not null
    and ct.part_of_concept_type_id <> ct.id

  union all

  select
    pw.start_id,
    next_ct.id as current_id,
    next_ct.part_of_concept_type_id as next_id,
    pw.visited || next_ct.id
  from part_walk pw
  join public.concept_type next_ct on next_ct.id = pw.next_id
  where pw.next_id is not null
    and not (next_ct.id = any(pw.visited))
), part_cycles as (
  select distinct
    pw.start_id,
    pw.next_id as cycle_entry_id
  from part_walk pw
  where pw.next_id is not null
    and pw.next_id = any(pw.visited)
)
select
  c.start_id,
  start_ct.name as start_name,
  c.cycle_entry_id,
  cycle_ct.name as cycle_entry_name
from part_cycles c
join public.concept_type start_ct on start_ct.id = c.start_id
join public.concept_type cycle_ct on cycle_ct.id = c.cycle_entry_id;

create view pg_temp.concept_type_refto_cycles as
with recursive ref_walk as (
  select
    ct.id as start_id,
    ct.id as current_id,
    ct.reference_to_concept_type_id as next_id,
    array[ct.id]::uuid[] as visited
  from public.concept_type ct
  where ct.reference_to_concept_type_id is not null

  union all

  select
    rw.start_id,
    next_ct.id as current_id,
    next_ct.reference_to_concept_type_id as next_id,
    rw.visited || next_ct.id
  from ref_walk rw
  join public.concept_type next_ct on next_ct.id = rw.next_id
  where rw.next_id is not null
    and not (next_ct.id = any(rw.visited))
), ref_cycles as (
  select distinct
    rw.start_id,
    rw.next_id as cycle_entry_id
  from ref_walk rw
  where rw.next_id is not null
    and rw.next_id = any(rw.visited)
)
select
  c.start_id,
  start_ct.name as start_name,
  c.cycle_entry_id,
  cycle_ct.name as cycle_entry_name
from ref_cycles c
join public.concept_type start_ct on start_ct.id = c.start_id
join public.concept_type cycle_ct on cycle_ct.id = c.cycle_entry_id;

create view pg_temp.concept_type_sibling_order_anomalies as
with sibling_rows as (
  select
    ct.id,
    ct.name,
    ct.part_of_concept_type_id as parent_id,
    parent.name as parent_name,
    ct.part_order,
    row_number() over (
      partition by ct.part_of_concept_type_id
      order by ct.part_order nulls last, ct.name
    ) as expected_order,
    count(*) over (
      partition by ct.part_of_concept_type_id, ct.part_order
    ) as duplicate_order_count
  from public.concept_type ct
  join public.concept_type parent on parent.id = ct.part_of_concept_type_id
)
select
  id,
  name,
  parent_id,
  parent_name,
  part_order,
  expected_order,
  duplicate_order_count
from sibling_rows
where part_order is null
   or part_order <> expected_order
   or (part_order is not null and duplicate_order_count > 1);

-- 1) Orphan PartOf links (healthy state: zero rows)
select *
from pg_temp.concept_type_orphan_partof
order by name;

-- 2) Broken ReferenceTo links (healthy state: zero rows)
select *
from pg_temp.concept_type_broken_refto
order by name;

-- 3) PartOf cycles (healthy state: zero rows; direct self PartOf is allowed and excluded)
select *
from pg_temp.concept_type_partof_cycles
order by start_name;

-- 4) ReferenceTo cycles (healthy state: zero rows)
select *
from pg_temp.concept_type_refto_cycles
order by start_name;

-- 5) Sibling order anomalies (healthy state: zero rows)
select *
from pg_temp.concept_type_sibling_order_anomalies
order by parent_name, expected_order, name;

-- 6) Summary counts (single-row quick health view)
select
  (select count(*) from pg_temp.concept_type_orphan_partof) as orphan_partof_count,
  (select count(*) from pg_temp.concept_type_broken_refto) as broken_reference_to_count,
  (select count(distinct start_id) from pg_temp.concept_type_partof_cycles) as partof_cycle_start_count,
  (select count(distinct start_id) from pg_temp.concept_type_refto_cycles) as reference_cycle_start_count,
  (select count(*) from pg_temp.concept_type_sibling_order_anomalies) as sibling_order_anomaly_row_count;
