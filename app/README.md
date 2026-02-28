# Concept Type Admin (MVP)

React + TypeScript + Vite application for managing `ConceptType` records backed by Supabase/Postgres.

## What this app does

- Authenticate users via Supabase magic-link sign-in.
- Create, edit, delete, and reorder concept types.
- Maintain structural relationships:
  - `PartOfConceptTypeId`
  - `ReferenceToConceptTypeId`
  - sibling `part_order`
- Import/export concept types as CSV.
- Preview CSV import impact (create/update/unchanged) before commit.
- Explore concept types in flat list or tree view from a selected root.
- Run data-quality checks in UI (where used, sibling-order issues, affected-item filtering).

## Prerequisites

- Node.js 20+
- npm
- Supabase project (URL + publishable key)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `app/.env.local`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_MODEL_WORKSPACE_ID=... # required for version-backed model management actions
```

3. Apply database migrations and optional diagnostics scripts using the setup guide:

- [`../SETUP_CONCEPTTYPE_MVP.md`](../SETUP_CONCEPTTYPE_MVP.md)

## Local development

```bash
npm run dev
```

## Quality checks

- Run tests:

```bash
npm run test:run
```

- Run lint (zero warnings allowed):

```bash
npm run lint
```

- Build production bundle:

```bash
npm run build
```

- Run the full gate locally (same as CI):

```bash
npm run verify
```

## Project structure (high level)

- `src/features/conceptTypes/components` – UI components (form, list/tree rows, import panel, issues panel)
- `src/features/conceptTypes/hooks` – state/orchestration hooks
- `src/features/conceptTypes/data` – Supabase data-access layer and error mapping
- `src/features/conceptTypes/csv` – CSV parsing/building types and utilities
- `src/features/conceptTypes/utils` – pure derivation and row helper functions

## Model Management Operations

The app includes a **Model Management** panel for high-impact maintenance actions:

- **Reset Model**: deletes all concept types; can create a version snapshot first.
- **Delete Structure**: deletes a selected root concept type and all `PartOf` descendants.
- **Emergency Purge**: deletes all concept types without creating a version snapshot.

Safety controls:

- Reason text is required.
- Typed confirmation phrase is required per action.
- Snapshot-backed actions require a valid `VITE_MODEL_WORKSPACE_ID` and enabled versioning flag.

Delete-structure external reference policy:

- External `PartOf` blockers always stop the operation.
- External `ReferenceTo` blockers can be handled by either:
  - **Block** (default), or
  - **Null ReferenceTo blockers and continue**.

## Related docs

- Setup and migrations: [`../SETUP_CONCEPTTYPE_MVP.md`](../SETUP_CONCEPTTYPE_MVP.md)
- Changelog: [`../CHANGELOG.md`](../CHANGELOG.md)
- Modeling conventions: [`../MODELING_CONVENTIONS.md`](../MODELING_CONVENTIONS.md)
- Model versioning draft: [`../MODEL_VERSIONING_V1_DRAFT.md`](../MODEL_VERSIONING_V1_DRAFT.md)
- Health checks SQL: [`../db/diagnostics/concept_type_health_checks.sql`](../db/diagnostics/concept_type_health_checks.sql)
- Remediation SQL: [`../db/diagnostics/concept_type_remediation.sql`](../db/diagnostics/concept_type_remediation.sql)

## Troubleshooting

- Magic-link sign-in fails with network/auth errors:
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `app/.env.local`.
  - Confirm Supabase Auth redirect settings include your local app URL.
  - Restart dev server after env changes.

- Save fails with `canceling statement due to statement timeout`:
  - Apply migration `../db/migrations/003_concept_type_cycle_trigger_timeout_fix.sql`.
  - Retry the update.

- CSV import errors:
  - Ensure required `name` column is present.
  - Ensure `partOrder` values are whole numbers greater than 0.
  - Default import mode is upsert-only: missing rows are not deleted unless full-sync + delete confirmation is enabled.
  - Use the sample template from the UI and run `npm run validate:concept-csv` for pre-checks.

- Model management snapshot actions fail:
  - Verify `VITE_MODEL_WORKSPACE_ID` is set to a valid UUID in `app/.env.local`.
  - Ensure model versioning feature flag is enabled if snapshot-backed actions are expected.

- Delete Structure is blocked unexpectedly:
  - Check for external `PartOf` blockers outside the selected subtree (these always block).
  - For external `ReferenceTo` blockers, choose the desired policy in Model Management:
    - Block, or
    - Null ReferenceTo blockers and continue.

- Sibling order looks inconsistent:
  - Use `Fix sibling order issues` in the app, or run remediation SQL in `../db/diagnostics/concept_type_remediation.sql`.
