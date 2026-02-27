# Changelog

## 2026-02-28

### Added
- Concept type diagnostics and remediation SQL scripts:
  - `db/diagnostics/concept_type_health_checks.sql`
  - `db/diagnostics/concept_type_remediation.sql`
- New UX capabilities in Concept Type admin:
  - Tree root filter modes: PartOf empty, self, empty-or-self, all
  - "Where used" quick actions from issues panel
  - Copy ID / Copy Name actions in flat and tree rows
  - Import preview diff before commit
  - Standalone import/export panel labeling
- Testing foundation with Vitest for pure logic modules:
  - CSV utility tests
  - Graph derivation tests
  - Row helper tests

### Changed
- Refactored Concept Type UI for modularity:
  - Split list rendering into focused components (`ConceptTypeFlatRow`, `ConceptTypeTreeNode`, `ConceptTypeIssuesPanel`)
  - Extracted derived graph state into `useConceptTypeGraphState`
  - Extracted reusable helpers for row behavior and graph derivation
  - Centralized shared form and list action types
- Improved save error messages with richer DB-aware mappings (constraint/code/detail handling)
- Added migration to prevent cycle-check timeout behavior during updates:
  - `db/migrations/003_concept_type_cycle_trigger_timeout_fix.sql`

### CI / Quality
- Added unit tests to CI and introduced a single quality gate script:
  - `app/package.json` -> `verify` (`test:run`, `lint`, `build`)
  - `.github/workflows/app-ci.yml` now runs `npm run verify`
- Tightened lint policy with `--max-warnings=0`
