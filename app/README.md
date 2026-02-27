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

## Related docs

- Setup and migrations: [`../SETUP_CONCEPTTYPE_MVP.md`](../SETUP_CONCEPTTYPE_MVP.md)
- Changelog: [`../CHANGELOG.md`](../CHANGELOG.md)
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
  - Use the sample template from the UI and run `npm run validate:concept-csv` for pre-checks.

- Sibling order looks inconsistent:
  - Use `Fix sibling order issues` in the app, or run remediation SQL in `../db/diagnostics/concept_type_remediation.sql`.
