-- Concept remediation audit trail v1

create table if not exists public.concept_remediation_audit (
  id uuid primary key default gen_random_uuid(),
  action_kind text not null,
  reason text,
  part_of_cleared_count integer not null default 0,
  reference_to_cleared_count integer not null default 0,
  affected_concept_ids uuid[] not null default '{}',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint chk_concept_remediation_action_kind_not_blank check (length(trim(action_kind)) > 0),
  constraint chk_concept_remediation_part_of_cleared_count_non_negative check (part_of_cleared_count >= 0),
  constraint chk_concept_remediation_reference_to_cleared_count_non_negative check (reference_to_cleared_count >= 0)
);

create index if not exists ix_concept_remediation_audit_created_at
  on public.concept_remediation_audit(created_at desc);

create index if not exists ix_concept_remediation_audit_created_by
  on public.concept_remediation_audit(created_by);

alter table public.concept_remediation_audit enable row level security;

drop policy if exists concept_remediation_audit_authenticated_select on public.concept_remediation_audit;
create policy concept_remediation_audit_authenticated_select
on public.concept_remediation_audit
for select
to authenticated
using (true);

drop policy if exists concept_remediation_audit_authenticated_insert on public.concept_remediation_audit;
create policy concept_remediation_audit_authenticated_insert
on public.concept_remediation_audit
for insert
to authenticated
with check (created_by = auth.uid());
