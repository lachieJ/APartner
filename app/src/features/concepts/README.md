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
