-- Concept model v1: instance-level concepts constrained by ConceptType semantics

create table if not exists public.concept (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  concept_type_id uuid not null references public.concept_type(id) on delete restrict,
  part_of_concept_id uuid references public.concept(id) on delete restrict,
  reference_to_concept_id uuid references public.concept(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_concept_name_not_blank check (length(trim(name)) > 0),
  constraint chk_concept_not_self_partof check (
    part_of_concept_id is null
    or part_of_concept_id <> id
  ),
  constraint chk_concept_not_self_reference check (
    reference_to_concept_id is null
    or reference_to_concept_id <> id
  )
);

create unique index if not exists uq_concept_name_ci_per_type
  on public.concept (concept_type_id, lower(name));

create index if not exists ix_concept_concept_type
  on public.concept (concept_type_id);

create index if not exists ix_concept_part_of
  on public.concept (part_of_concept_id);

create index if not exists ix_concept_reference_to
  on public.concept (reference_to_concept_id);

drop trigger if exists trg_concept_set_updated_at on public.concept;
create trigger trg_concept_set_updated_at
before update on public.concept
for each row
execute function public.set_updated_at();

create or replace function public.concept_validate_semantics()
returns trigger
language plpgsql
as $$
declare
  current_type record;
  parent_concept_type_id uuid;
  reference_concept_type_id uuid;
  part_cycle_found boolean;
begin
  select
    id,
    name,
    part_of_concept_type_id,
    reference_to_concept_type_id
  into current_type
  from public.concept_type
  where id = new.concept_type_id;

  if current_type.id is null then
    raise exception 'ConceptType does not exist for Concept %.', new.name;
  end if;

  if new.part_of_concept_id is not null then
    select concept_type_id
    into parent_concept_type_id
    from public.concept
    where id = new.part_of_concept_id;

    if parent_concept_type_id is null then
      raise exception 'PartOf concept does not exist.';
    end if;

    if current_type.part_of_concept_type_id is null then
      raise exception 'ConceptType % does not allow PartOf relationships.', current_type.name;
    end if;

    if parent_concept_type_id <> current_type.part_of_concept_type_id then
      raise exception
        'PartOf concept type mismatch: % expects parent type id %, received %.',
        current_type.name,
        current_type.part_of_concept_type_id,
        parent_concept_type_id;
    end if;

    with recursive walk(id) as (
      select new.part_of_concept_id
      union all
      select c.part_of_concept_id
      from public.concept c
      join walk w on c.id = w.id
      where c.part_of_concept_id is not null
    )
    select exists(select 1 from walk where id = new.id) into part_cycle_found;

    if part_cycle_found then
      raise exception 'PartOfConcept cycle detected for Concept %.', new.id;
    end if;
  end if;

  if new.reference_to_concept_id is not null then
    select concept_type_id
    into reference_concept_type_id
    from public.concept
    where id = new.reference_to_concept_id;

    if reference_concept_type_id is null then
      raise exception 'ReferenceTo concept does not exist.';
    end if;

    if current_type.reference_to_concept_type_id is null then
      raise exception 'ConceptType % does not allow ReferenceTo relationships.', current_type.name;
    end if;

    if reference_concept_type_id <> current_type.reference_to_concept_type_id then
      raise exception
        'ReferenceTo concept type mismatch: % expects reference type id %, received %.',
        current_type.name,
        current_type.reference_to_concept_type_id,
        reference_concept_type_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_concept_validate_semantics on public.concept;
create trigger trg_concept_validate_semantics
before insert or update of concept_type_id, part_of_concept_id, reference_to_concept_id
on public.concept
for each row
execute function public.concept_validate_semantics();

alter table public.concept enable row level security;

drop policy if exists concept_authenticated_select on public.concept;
create policy concept_authenticated_select
on public.concept
for select
to authenticated
using (true);

drop policy if exists concept_authenticated_insert on public.concept;
create policy concept_authenticated_insert
on public.concept
for insert
to authenticated
with check (true);

drop policy if exists concept_authenticated_update on public.concept;
create policy concept_authenticated_update
on public.concept
for update
to authenticated
using (true)
with check (true);

drop policy if exists concept_authenticated_delete on public.concept;
create policy concept_authenticated_delete
on public.concept
for delete
to authenticated
using (true);
