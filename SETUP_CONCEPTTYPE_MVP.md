# ConceptType MVP Setup (Supabase + React)

## 1) Supabase project

1. Create a Supabase project (free tier is fine).
2. Open SQL Editor and run `db/migrations/001_concept_type.sql`.
3. Run `db/migrations/002_concept_type_part_order.sql` (adds sibling ordering support).
4. Run `db/migrations/003_concept_type_cycle_trigger_timeout_fix.sql` (prevents recursive cycle checks from timing out on updates).
5. Optional draft for future model import rollback/versioning: run `db/migrations/004_model_versioning_v1_draft.sql` (creates schema but remains disabled by feature flag).
6. Optional draft follow-up: run `db/migrations/005_model_versioning_v1_functions.sql` (adds feature-flagged commit/rollback RPC functions).
7. Optional health check: run `db/diagnostics/concept_type_health_checks.sql` to detect existing graph/order anomalies before imports or large edits.
8. Optional remediation helpers: run `db/diagnostics/concept_type_remediation.sql` for sibling-order normalization and guided cycle cleanup candidates.
9. In Authentication settings, enable Email (magic link).
10. In URL configuration, set:
   - Site URL: `http://localhost:5173`
   - Additional redirect URL: `http://localhost:5173`
11. Copy:
   - Project URL
   - Publishable key (preferred)

## 2) Frontend environment

1. Copy `app/.env.example` to `app/.env.local`.
2. Set values:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_MODEL_WORKSPACE_ID=00000000-0000-0000-0000-000000000001
```

`VITE_MODEL_WORKSPACE_ID` is used by snapshot-backed model management actions (reset/delete-structure with version capture).

## 3) Node version (recommended)

Use Node `20.x` for current Supabase + tooling compatibility:

```bash
node -v
```

If you are on Node 18, the app may still run, but install/audit output can show extra warnings.

## 4) Run locally

```bash
cd app
npm install
npm run dev
```

Open the app, sign in with magic link, then create/update/delete `ConceptType` rows.

## 5) CSV import/export columns

Supported import/export header columns:

`name,description,partOfName,partOrder,referenceToName`

Rules:

- `partOrder` is optional.
- If provided, it must be a whole number `>= 1`.
- `partOrder` requires `partOfName`.
- If `partOfName` is set and `partOrder` is blank, the app defaults to `1`.

Optional pre-check before import:

```bash
python3 scripts/validate_concept_type_csv.py "*.csv"
```

## 6) GitHub + CI

- Push repository to GitHub.
- CI workflow is in `.github/workflows/app-ci.yml` and runs `npm ci` + `npm run build` for app changes.

## 7) Deploy (Vercel)

1. Import repo in Vercel.
2. Set root directory to `app`.
3. Configure environment variables from `app/.env.example`.
4. Deploy from `main`.

## Notes on vulnerabilities

- `npm audit --omit=dev` is the best indicator of runtime risk for this app.
- Current high/moderate findings are from dev tooling in the Node 18 path.
- Moving local dev to Node 20 reduces these warnings and aligns with current package support.
