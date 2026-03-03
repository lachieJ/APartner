-- Root-scoped concept uniqueness
-- Goal: allow duplicate concept names across different root trees,
-- while preserving uniqueness within (concept_type_id, root_concept_id).

alter table public.concept
  add column if not exists root_concept_id uuid;

create or replace function public.concept_resolve_root_id(p_concept_id uuid)
returns uuid
language sql
stable
as $$
  with recursive walk as (
    select c.id, c.part_of_concept_id
    from public.concept c
    where c.id = p_concept_id

    union all

    select parent.id, parent.part_of_concept_id
    from public.concept parent
    join walk w on parent.id = w.part_of_concept_id
  )
  select coalesce(
    (select id from walk where part_of_concept_id is null limit 1),
    p_concept_id
  );
$$;

create or replace function public.concept_assign_root_concept_id()
returns trigger
language plpgsql
as $$
declare
  parent_root_id uuid;
begin
  if new.part_of_concept_id is null then
    new.root_concept_id = new.id;
    return new;
  end if;

  select c.root_concept_id
  into parent_root_id
  from public.concept c
  where c.id = new.part_of_concept_id;

  if parent_root_id is null then
    parent_root_id := new.part_of_concept_id;
  end if;

  new.root_concept_id := parent_root_id;
  return new;
end;
$$;

drop trigger if exists trg_concept_assign_root_concept_id on public.concept;
create trigger trg_concept_assign_root_concept_id
before insert or update of part_of_concept_id
on public.concept
for each row
execute function public.concept_assign_root_concept_id();

update public.concept c
set root_concept_id = public.concept_resolve_root_id(c.id)
where c.root_concept_id is null
   or c.root_concept_id is distinct from public.concept_resolve_root_id(c.id);

create or replace function public.concept_sync_descendant_root_concept_id()
returns trigger
language plpgsql
as $$
begin
  with recursive descendants as (
    select c.id
    from public.concept c
    where c.part_of_concept_id = new.id

    union all

    select c2.id
    from public.concept c2
    join descendants d on c2.part_of_concept_id = d.id
  )
  update public.concept c
  set root_concept_id = new.root_concept_id
  where c.id in (select id from descendants)
    and c.root_concept_id is distinct from new.root_concept_id;

  return null;
end;
$$;

drop trigger if exists trg_concept_sync_descendant_root_concept_id on public.concept;
create trigger trg_concept_sync_descendant_root_concept_id
after update of part_of_concept_id
on public.concept
for each row
execute function public.concept_sync_descendant_root_concept_id();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_concept_root_concept_id'
      and conrelid = 'public.concept'::regclass
  ) then
    alter table public.concept
      add constraint fk_concept_root_concept_id
      foreign key (root_concept_id)
      references public.concept(id)
      on delete restrict;
  end if;
end;
$$;

alter table public.concept
  alter column root_concept_id set not null;

drop index if exists uq_concept_name_ci_per_type;

create unique index if not exists uq_concept_name_ci_per_type_per_root
  on public.concept (concept_type_id, root_concept_id, lower(name));

create index if not exists ix_concept_root_concept
  on public.concept (root_concept_id);
