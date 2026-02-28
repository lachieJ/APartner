# Model Versioning V1 Draft

## Status

Discussion draft for review. This document defines a practical V1 model-versioning approach for import safety, rollback, and auditability.

Current repository status:

- Draft migration added: `db/migrations/004_model_versioning_v1_draft.sql`
- Function migration added: `db/migrations/005_model_versioning_v1_functions.sql`
- Rollout mode: disabled by default using feature flag `model_versioning_v1`
- Existing ConceptType workflows remain unchanged until application code explicitly opts in.
- Service scaffolding added (no UI wiring):
  - `app/src/features/conceptTypes/types/modelVersioning.ts`
  - `app/src/features/conceptTypes/data/modelVersioningService.ts`
- Service behavior now includes:
  - Real preview counts (create/update/delete/unchanged) against current `concept_type`
  - Snapshot commit RPC (`model_versioning_commit_snapshot`)
  - Rollback RPC (`model_versioning_rollback_to_version`)

## Locked Decisions

1. Rollback creates a **new version cloned from an old snapshot**.
2. Imports allow create, update, and delete operations.
3. Import metadata requires `filename` and `reason`.
4. `change_summary` is optional but recommended.
5. Conservative import guardrails apply:
  - Default mode is `upsert-only` (missing rows are not deleted).
  - `full-sync` mode can infer deletes from missing rows, but requires explicit delete confirmation.

## Objectives

- Make imports reversible without destructive history rewrites.
- Preserve complete audit trail (who, what, when, why).
- Keep V1 simple enough to implement with Supabase/Postgres.

## Non-Goals (V1)

- Branch/merge model editing.
- Complex approval workflows.
- Partial rollback of individual rows inside a committed version.

## Domain Model

- `model_version`: immutable metadata per committed snapshot.
- `model_version_item`: all model rows for one version (snapshot rows).
- `model_head`: pointer to current version per workspace.

## SQL Draft

```sql
create table model_version (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  version_no integer not null,
  parent_version_id uuid null references model_version(id),
  source text not null check (source in ('import', 'rollback', 'manual')),
  filename text not null,
  reason text not null,
  change_summary jsonb null,
  file_hash text null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, version_no)
);

create index ix_model_version_workspace_created
  on model_version (workspace_id, created_at desc);

create table model_version_item (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references model_version(id) on delete cascade,
  stable_key text not null,
  concept_type_id uuid not null,
  name text not null,
  description text null,
  part_of_stable_key text null,
  reference_to_stable_key text null,
  unique (model_version_id, stable_key)
);

create index ix_model_version_item_version
  on model_version_item (model_version_id);

create table model_head (
  workspace_id uuid primary key,
  current_version_id uuid not null references model_version(id),
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);
```

## Optional `change_summary` Schema

```json
{
  "counts": {
    "created": 0,
    "updated": 0,
    "deleted": 0,
    "unchanged": 0,
    "total": 0
  },
  "byConceptType": {
    "Program": { "created": 0, "updated": 0, "deleted": 0 }
  },
  "highImpact": {
    "deletePercent": 0,
    "maxDepthChanged": 0
  },
  "warnings": []
}
```

## API Draft

### Preview Import

`POST /model/import/preview`

Request:

```json
{
  "workspaceId": "uuid",
  "filename": "government-model.csv",
  "reason": "Monthly refresh",
  "csv": "name,description,...",
  "importMode": "upsert-only"
}
```

Response:

```json
{
  "previewToken": "opaque-token",
  "currentVersionId": "uuid",
  "counts": {
    "created": 12,
    "updated": 7,
    "deleted": 3,
    "unchanged": 54,
    "total": 76
  },
  "changeSummary": {
    "counts": {
      "created": 12,
      "updated": 7,
      "deleted": 3,
      "unchanged": 54,
      "total": 76
    },
    "deleteCandidates": ["Legacy Type A", "Legacy Type B"]
  },
  "warnings": [
    "Deletes detected: 3"
  ],
  "errors": []
}
```

### Commit Import

`POST /model/import/commit`

Request:

```json
{
  "workspaceId": "uuid",
  "previewToken": "opaque-token",
  "filename": "government-model.csv",
  "reason": "Monthly refresh",
  "importMode": "full-sync",
  "allowDeletes": true,
  "confirmHighImpact": false,
  "changeSummary": {
    "counts": {
      "created": 12,
      "updated": 7,
      "deleted": 3,
      "unchanged": 54,
      "total": 76
    }
  }
}
```

Response:

```json
{
  "versionId": "uuid",
  "versionNo": 18,
  "parentVersionId": "uuid",
  "source": "import"
}
```

### List Versions

`GET /model/versions?workspaceId=uuid`

Response includes: id, versionNo, source, filename, reason, createdBy, createdAt, summary counts.

### Rollback (New Version from Old Snapshot)

`POST /model/rollback`

Request:

```json
{
  "workspaceId": "uuid",
  "targetVersionId": "uuid",
  "filename": "rollback-from-v12",
  "reason": "Bad import detected",
  "changeSummary": {
    "counts": {
      "created": 0,
      "updated": 0,
      "deleted": 0,
      "unchanged": 76,
      "total": 76
    }
  }
}
```

Response:

```json
{
  "versionId": "uuid",
  "versionNo": 19,
  "parentVersionId": "uuid",
  "source": "rollback"
}
```

## Transaction Semantics

Both import commit and rollback run as single transactions:

1. Validate input and permissions.
2. Create `model_version` row.
3. Insert all `model_version_item` snapshot rows.
4. Update `model_head.current_version_id`.
5. Commit.

If any step fails, rollback the transaction.

## Safety Controls

- Require non-empty `filename` and `reason`.
- Mark historical versions read-only.
- Default to `upsert-only` mode where missing rows are not deleted.
- Allow inferred deletes only in `full-sync` mode with `allowDeletes=true`.
- Enforce high-impact threshold (currently 20% deletes) requiring `confirmHighImpact=true`.
- Store `file_hash` to identify accidental duplicate imports.

## Structure Delete External Reference Policy

Current implementation supports two policies for external `ReferenceTo` links when deleting a structure:

- `block` (default): stop operation when external `ReferenceTo` links target the subtree.
- `null-reference-to`: clear external `ReferenceTo` links to subtree nodes, then continue delete.

External `PartOf` links from outside the subtree always block structure delete.

## TypeScript Interfaces (Draft)

```ts
export type VersionSource = 'import' | 'rollback' | 'manual'

export type ChangeSummary = {
  counts: {
    created: number
    updated: number
    deleted: number
    unchanged: number
    total: number
  }
  byConceptType?: Record<string, { created: number; updated: number; deleted: number }>
  highImpact?: { deletePercent?: number; maxDepthChanged?: number }
  warnings?: string[]
}

export type ModelVersion = {
  id: string
  workspaceId: string
  versionNo: number
  parentVersionId: string | null
  source: VersionSource
  filename: string
  reason: string
  changeSummary: ChangeSummary | null
  fileHash: string | null
  createdBy: string
  createdAt: string
}

export type ImportPreviewResponse = {
  previewToken: string
  currentVersionId: string
  counts: ChangeSummary['counts']
  changeSummary?: ChangeSummary
  warnings: string[]
  errors: string[]
}
```

## Open Design Questions

1. Should `stable_key` be supplied by CSV or generated from name plus deterministic normalization?
2. Should rollback copy target `change_summary` or compute a dedicated rollback summary?
3. Should delete threshold be global or workspace-configurable?

## Suggested Next Step

Produce migration scripts and repository interfaces behind a feature flag, then implement preview/commit/rollback service methods without enabling UI actions yet.

## Rollout Control

Feature flag table: `public.app_feature_flag`

Default state after migration:

```sql
select key, enabled
from public.app_feature_flag
where key = 'model_versioning_v1';
```

Enable in a target environment:

```sql
update public.app_feature_flag
set enabled = true,
    updated_at = now()
where key = 'model_versioning_v1';
```

Disable again:

```sql
update public.app_feature_flag
set enabled = false,
    updated_at = now()
where key = 'model_versioning_v1';
```
