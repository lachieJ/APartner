# PR Title

Concepts: root-scoped uniqueness + safe CSV import disambiguation

# PR Description

## Summary
This change introduces root-scoped concept name uniqueness, updates compact model-copy behavior to preserve original concept names, and hardens CSV import so non-unique names can be resolved safely.

## What Changed
- Added DB migration for root-scoped uniqueness:
  - Introduces `root_concept_id` on concepts.
  - Backfills and maintains `root_concept_id` via trigger logic.
  - Replaces per-type unique name index with per-root-tree unique index.
- Updated compact “Copy model from root” behavior:
  - Copies subtree nodes while preserving original names.
  - Keeps current scope restriction (true-root only; decomposable-root excluded).
- Hardened concept CSV import:
  - Added optional identifier columns: `conceptId`, `rootConceptId`, `partOfConceptId`, `referenceToConceptId`.
  - Updated parser/export/error CSV generation to include the new ID columns.
  - Import resolution now prefers IDs first, then falls back to root-scoped name matching.
  - Ambiguity is handled at row level with actionable error messages (instead of global fail-fast).
- Updated docs/changelog and test fixtures for `root_concept_id`.

## Why
- Supports realistic modeling where repeated child names can exist in different root trees.
- Aligns copy behavior with the new uniqueness model and user expectations.
- Reduces import risk by allowing deterministic disambiguation when names are not globally unique.

## Validation
- `npm run verify` passed:
  - tests
  - lint
  - build

## Rollout Notes
- Apply migration before relying on root-scoped naming behavior in shared environments.
- For highest import reliability, include ID columns in CSV files where possible.

## Risks / Follow-ups
- Legacy CSV files without IDs may still produce row-level ambiguity errors in edge cases.
- A future enhancement can improve UX around bulk remediation of ambiguous rows.

## Checklist
- [x] Migration added
- [x] App logic updated
- [x] Tests updated and passing
- [x] Docs/changelog updated
