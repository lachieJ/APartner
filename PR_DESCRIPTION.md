# PR Title

Concepts: root-scoped uniqueness + name-preserving copy-from-root

# PR Description

## Summary
This change introduces root-scoped concept name uniqueness and updates compact model-copy behavior to preserve original concept names.

## What Changed
- Added DB migration for root-scoped uniqueness:
  - Introduces `root_concept_id` on concepts.
  - Backfills and maintains `root_concept_id` via trigger logic.
  - Replaces per-type unique name index with per-root-tree unique index.
- Updated compact “Copy model from root” behavior:
  - Copies subtree nodes while preserving original names.
  - Keeps current scope restriction (true-root only; decomposable-root excluded).
- Added import safety guard:
  - Fails fast when `conceptTypeName + name` becomes ambiguous across root trees.
- Updated docs/changelog and test fixtures for `root_concept_id`.

## Why
- Supports realistic modeling where repeated child names can exist in different root trees.
- Aligns copy behavior with the new uniqueness model and user expectations.

## Validation
- `npm run verify` passed:
  - tests
  - lint
  - build

## Rollout Notes
- Apply migration before relying on root-scoped naming behavior in shared environments.
- Import remains protected against ambiguous legacy keying until root-aware import keys are introduced.

## Risks / Follow-ups
- Existing import key model (`conceptTypeName + name`) is intentionally guarded, not redesigned yet.
- A future enhancement should add root-aware import identifiers to remove ambiguity permanently.

## Checklist
- [x] Migration added
- [x] App logic updated
- [x] Tests updated and passing
- [x] Docs/changelog updated
