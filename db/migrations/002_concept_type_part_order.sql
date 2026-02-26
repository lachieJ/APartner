alter table public.concept_type
add column if not exists part_order integer;

alter table public.concept_type
drop constraint if exists chk_part_order_positive;

alter table public.concept_type
add constraint chk_part_order_positive
check (part_order is null or part_order >= 1);

create index if not exists ix_concept_type_part_of_order
on public.concept_type(part_of_concept_type_id, part_order);
