# PR Title

Concepts: Value Stream maintenance window v1 + OSS governance baseline

# PR Description

## Summary
This PR combines two intentionally separated commits:

1. Feature work for a specialized **Value Stream maintenance** window in Concept Models.
2. Open-source readiness updates (license, community health files, and contribution templates).

## Commit 1 — Feature
**Commit:** `6ebb67f`  
**Message:** `feat(concepts): add value stream maintenance window v1`

### What changed
- Added new Concept Models view mode: **Value Stream maintenance**.
- Added dedicated component for the value stream workflow:
  - `app/src/features/concepts/components/ConceptValueStreamWindow.tsx`
- Wired new mode into existing view controls and section routing.
- Extended model-view state type to include `value-stream` mode.
- Added styling for top panels, stage scroller, dense stage rows, and sticky stage header.

### Behavior highlights
- Auto-targets `Value Stream` and `Value Stream Stage` concept types by name.
- Reuses compact maintenance controller/actions for consistency (add/edit/delete/move/reference create).
- Layout:
  - Top panel for selected Value Stream concept.
  - Top panel for non-stage related child concepts.
  - Vertically scrolling stage rows with nested detail child types.
- `Show edit controls` toggle gates maintenance actions.

## Commit 2 — Open source/governance
**Commit:** `737c36b`  
**Message:** `docs(oss): add license, policies, and contribution templates`

### What changed
- Added Apache 2.0 license file at repo root.
- Added/updated core open-source docs:
  - `README.md` (root)
  - `CONTRIBUTING.md`
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md`
  - `app/README.md` (open-source section)
- Added GitHub contribution workflows:
  - `.github/ISSUE_TEMPLATE/bug_report.yml`
  - `.github/ISSUE_TEMPLATE/feature_request.yml`
  - `.github/ISSUE_TEMPLATE/config.yml`
  - `.github/pull_request_template.md`
- Added app package metadata:
  - `app/package.json` → `"license": "Apache-2.0"`

### Security disclosure path
- Configured issue template contact link and security doc to use:
  - `https://github.com/lachieJ/APartner/security/policy`

## Validation
- Feature work previously validated with app build checks during implementation.
- Split commit structure verified and working tree confirmed clean after commit.

## Reviewer notes
- The two commits are intentionally scoped and can be reviewed independently:
  - Commit 1: product/UI behavior
  - Commit 2: legal/community/project governance
