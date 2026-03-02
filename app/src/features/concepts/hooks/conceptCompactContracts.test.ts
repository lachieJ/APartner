import { describe, expectTypeOf, it } from 'vitest'
import type {
  ConceptCompactControllerContract,
  ConceptCompactViewControllerContract,
} from './useConceptCompactController'
import type {
  BranchActionsContract,
  BranchDataContract,
  BranchDraftActionsContract,
  BranchUiContract,
  ConceptCompactBranchContract,
} from '../components/ConceptCompactBranch'

describe('concept compact contracts', () => {
  it('keeps the view controller contract assignable from the full controller contract', () => {
    expectTypeOf<ConceptCompactControllerContract>().toMatchTypeOf<ConceptCompactViewControllerContract>()
  })

  it('keeps the branch contract aligned with grouped branch prop contracts', () => {
    expectTypeOf<ConceptCompactBranchContract>().toMatchTypeOf<{
      data: BranchDataContract
      ui: BranchUiContract
      draftActions: BranchDraftActionsContract
      actions: BranchActionsContract
    }>()
  })
})
