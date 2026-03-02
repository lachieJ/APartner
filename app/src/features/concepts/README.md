# Concepts Feature Notes

## Compact Contract Naming

For compact-tree grouped contracts, use `*Contract` type names as the canonical exports.

Current canonical names are defined in `components/ConceptCompactBranch.tsx`:

- `BranchDataContract`
- `BranchUiContract`
- `BranchDraftActionsContract`
- `BranchActionsContract`
- `ConceptCompactBranchContract`

Avoid reintroducing legacy alias names such as `*Props` for these grouped contract types.

## Compact Branch Context Pattern

The compact tree uses a provider + hook split to keep recursive branch props minimal:

- Provider component: `components/ConceptCompactBranchProvider.tsx`
- Context + hook: `hooks/useConceptCompactBranchContext.ts`
- Consumer: `components/ConceptCompactBranch.tsx`

When adding compact node features, prefer updating `ConceptCompactBranchContract` and consuming via context rather than threading large recursive prop sets.

## Guided Maintain Removal Note

The legacy **Maintain Concepts (Guided)** section was intentionally removed from the active UI.

- Removed capability: guided bulk/multi-add workflow.
- Current path: creation and maintenance through editor + compact/tree views.
- Future option: reintroduce bulk/multi-add in a canvas-specific flow if/when required.

This keeps the current concepts surface lean while preserving room to add targeted high-throughput creation UX in future canvases.
