-- ConceptType MVP schema (Postgres/Supabase)
create extension if not exists pgcrypto;

create table if not exists public.concept_type (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  part_of_concept_type_id uuid references public.concept_type(id) on delete restrict,
  reference_to_concept_type_id uuid references public.concept_type(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_reference_requires_partof
    check (
      reference_to_concept_type_id is null
      or part_of_concept_type_id is not null
    ),
  constraint chk_not_self_reference
    check (
      reference_to_concept_type_id is null
      or reference_to_concept_type_id <> id
    )
);

create unique index if not exists uq_concept_type_name_ci
  on public.concept_type (lower(name));

create index if not exists ix_concept_type_part_of
  on public.concept_type(part_of_concept_type_id);

create index if not exists ix_concept_type_reference_to
  on public.concept_type(reference_to_concept_type_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_concept_type_set_updated_at on public.concept_type;
create trigger trg_concept_type_set_updated_at
before update on public.concept_type
for each row
execute function public.set_updated_at();

create or replace function public.concept_type_prevent_cycles()
returns trigger
language plpgsql
as $$
declare
  cycle_found boolean;
begin
  -- PART-OF cycle check
  -- direct self-decomposition is allowed (new.part_of_concept_type_id = new.id)
  if new.part_of_concept_type_id is not null
     and new.part_of_concept_type_id <> new.id then
    with recursive walk(id) as (
      select new.part_of_concept_type_id
      union all
      select c.part_of_concept_type_id
      from public.concept_type c
      join walk w on c.id = w.id
      where c.part_of_concept_type_id is not null
    )
    select exists(select 1 from walk where id = new.id) into cycle_found;

    if cycle_found then
      raise exception 'PartOfConceptTypeId cycle detected for ConceptType %', new.id;
    end if;
  end if;

  -- REFERENCE cycle check
  if new.reference_to_concept_type_id is not null then
    with recursive walk(id) as (
      select new.reference_to_concept_type_id
      union all
      select c.reference_to_concept_type_id
      from public.concept_type c
      join walk w on c.id = w.id
      where c.reference_to_concept_type_id is not null
    )
    select exists(select 1 from walk where id = new.id) into cycle_found;

    if cycle_found then
      raise exception 'ReferenceToConceptTypeId cycle detected for ConceptType %', new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_concept_type_prevent_cycles on public.concept_type;
create trigger trg_concept_type_prevent_cycles
before insert or update of part_of_concept_type_id, reference_to_concept_type_id
on public.concept_type
for each row
execute function public.concept_type_prevent_cycles();

alter table public.concept_type enable row level security;

drop policy if exists concept_type_authenticated_select on public.concept_type;
create policy concept_type_authenticated_select
on public.concept_type
for select
to authenticated
using (true);

drop policy if exists concept_type_authenticated_insert on public.concept_type;
create policy concept_type_authenticated_insert
on public.concept_type
for insert
to authenticated
with check (true);

drop policy if exists concept_type_authenticated_update on public.concept_type;
create policy concept_type_authenticated_update
on public.concept_type
for update
to authenticated
using (true)
with check (true);

drop policy if exists concept_type_authenticated_delete on public.concept_type;
create policy concept_type_authenticated_delete
on public.concept_type
for delete
to authenticated
using (true);
