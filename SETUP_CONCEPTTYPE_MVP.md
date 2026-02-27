# ConceptType MVP Setup (Supabase + React)

## 1) Supabase project

1. Create a Supabase project (free tier is fine).
2. Open SQL Editor and run `db/migrations/001_concept_type.sql`.
3. Run `db/migrations/002_concept_type_part_order.sql` (adds sibling ordering support).
4. Run `db/migrations/003_concept_type_cycle_trigger_timeout_fix.sql` (prevents recursive cycle checks from timing out on updates).
5. Optional health check: run `db/diagnostics/concept_type_health_checks.sql` to detect existing graph/order anomalies before imports or large edits.
6. Optional remediation helpers: run `db/diagnostics/concept_type_remediation.sql` for sibling-order normalization and guided cycle cleanup candidates.
4. In Authentication settings, enable Email (magic link).
5. In URL configuration, set:
   - Site URL: `http://localhost:5173`
   - Additional redirect URL: `http://localhost:5173`
6. Copy:
   - Project URL
   - Publishable key (preferred)

## 2) Frontend environment

1. Copy `app/.env.example` to `app/.env.local`.
2. Set values:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

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
