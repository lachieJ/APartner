create or replace function public.concept_type_prevent_cycles()
returns trigger
language plpgsql
as $$
declare
  cycle_found boolean;
begin
  if tg_op = 'UPDATE'
     and new.part_of_concept_type_id is not distinct from old.part_of_concept_type_id
     and new.reference_to_concept_type_id is not distinct from old.reference_to_concept_type_id then
    return new;
  end if;

  -- PART-OF cycle check
  -- direct self-decomposition is allowed (new.part_of_concept_type_id = new.id)
  if new.part_of_concept_type_id is not null
     and new.part_of_concept_type_id <> new.id then
    with recursive walk(id, path) as (
      select new.part_of_concept_type_id, array[new.part_of_concept_type_id]
      union all
      select c.part_of_concept_type_id, w.path || c.part_of_concept_type_id
      from public.concept_type c
      join walk w on c.id = w.id
      where c.part_of_concept_type_id is not null
        and not (c.part_of_concept_type_id = any(w.path))
    )
    select exists(select 1 from walk where id = new.id) into cycle_found;

    if cycle_found then
      raise exception 'PartOfConceptTypeId cycle detected for ConceptType %', new.id;
    end if;
  end if;

  -- REFERENCE cycle check
  if new.reference_to_concept_type_id is not null then
    with recursive walk(id, path) as (
      select new.reference_to_concept_type_id, array[new.reference_to_concept_type_id]
      union all
      select c.reference_to_concept_type_id, w.path || c.reference_to_concept_type_id
      from public.concept_type c
      join walk w on c.id = w.id
      where c.reference_to_concept_type_id is not null
        and not (c.reference_to_concept_type_id = any(w.path))
    )
    select exists(select 1 from walk where id = new.id) into cycle_found;

    if cycle_found then
      raise exception 'ReferenceToConceptTypeId cycle detected for ConceptType %', new.id;
    end if;
  end if;

  return new;
end;
$$;