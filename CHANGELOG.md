# Changelog

## 2026-03-03

### Added
- Compact MetaModel maintenance mode in Concept Type admin:
  - New **Compact maintenance tree** view with inline root/child create, inline edit, per-node delete, and sibling up/down controls.
  - Added compact tree depth filtering (`All`, `0..6`) and edit-controls toggle for focused maintenance workflows.
  - Added contract tests to lock compact metamodel callback/type alignment.
- Root-scoped concept model copy in Compact Concepts view:
  - Added **Copy model from root** action for duplicating a selected root concept subtree.
  - Copy now preserves original concept names under root-scoped uniqueness.
  - Initial scope intentionally excludes decomposable-root selections.

### Changed
- Clarified MetaModel/Concept workspace navigation labels for stronger separation of metamodel vs concept-instance maintenance.
- Added editor-level delete action for concept maintenance and compact-tree delete parity for concept nodes.
- Updated app documentation with a dedicated compact metamodel maintenance section.

## 2026-03-02

### Changed
- Simplified Concepts maintenance surface:
  - Removed **Maintain Concepts (Guided)** from active UI.
  - Removed guided-maintain implementation files and queue hook that were only used by that surface.
  - Documented that bulk/multi-add may be reintroduced later in a canvas-specific flow.
- Improved Compact Concepts tree maintenance UX:
  - Added sibling ordering controls (`Order siblings`) gated by edit controls.
  - Added per-node sibling move actions (`↑` / `↓`) with position-aware enablement and in-progress disabling.
  - Added compact tree depth filtering (`All`, `0..6`) where `0` displays root content only.
- Continued concepts refactor hardening for future canvas reuse:
  - Centralized root semantics in shared utilities.
  - Introduced compact branch provider/context pattern to reduce recursive prop threading.
  - Standardized compact grouped contract naming to canonical `*Contract` exports.

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
