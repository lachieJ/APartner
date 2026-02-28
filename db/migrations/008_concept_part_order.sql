alter table public.concept
add column if not exists part_order integer;

alter table public.concept
drop constraint if exists chk_concept_part_order_positive;

alter table public.concept
add constraint chk_concept_part_order_positive
check (part_order is null or part_order >= 1);

alter table public.concept
drop constraint if exists chk_concept_part_order_requires_partof;

alter table public.concept
add constraint chk_concept_part_order_requires_partof
check (
  part_order is null
  or part_of_concept_id is not null
);

create index if not exists ix_concept_part_of_order
on public.concept(part_of_concept_id, part_order);
