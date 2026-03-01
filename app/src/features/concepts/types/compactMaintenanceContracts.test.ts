import type { Dispatch, SetStateAction } from 'react'
import { describe, expectTypeOf, it } from 'vitest'
import type { ConceptCompactControllerContract } from '../hooks/useConceptCompactController'
import { useConceptCompactUiState } from '../hooks/useConceptCompactUiState'
import type {
  CompactConceptDraft,
  CompactCreateDraftByParentTypeKey,
  CompactEditDraftByConceptId,
  CompactPendingReferenceSelection,
  CompactPendingRootSelection,
  CompactQuickReferenceCreateDraft,
  CompactQuickReferenceDraftByKey,
  CompactRootCreateDraft,
} from './compactMaintenance'

type UiState = ReturnType<typeof useConceptCompactUiState>

describe('compact maintenance contract alignment', () => {
  it('keeps useConceptCompactUiState return shape aligned with shared compact draft types', () => {
    expectTypeOf<UiState['rootCreateDraft']>().toEqualTypeOf<CompactRootCreateDraft>()
    expectTypeOf<UiState['setRootCreateDraft']>().toMatchTypeOf<
      Dispatch<SetStateAction<CompactRootCreateDraft>>
    >()

    expectTypeOf<UiState['createDraftByParentTypeKey']>().toEqualTypeOf<CompactCreateDraftByParentTypeKey>()
    expectTypeOf<UiState['editDraftByConceptId']>().toEqualTypeOf<CompactEditDraftByConceptId>()
    expectTypeOf<UiState['quickReferenceCreateDraftByKey']>().toEqualTypeOf<CompactQuickReferenceDraftByKey>()

    expectTypeOf<UiState['pendingRootSelection']>().toEqualTypeOf<CompactPendingRootSelection | null>()
    expectTypeOf<UiState['pendingReferenceSelectionByKey']>().toEqualTypeOf<
      Record<string, CompactPendingReferenceSelection>
    >()

    expectTypeOf<Parameters<UiState['setCreateDraft']>[2]>().toEqualTypeOf<Partial<CompactConceptDraft>>()
    expectTypeOf<Parameters<UiState['setEditDraft']>[1]>().toEqualTypeOf<Partial<CompactConceptDraft>>()
    expectTypeOf<Parameters<UiState['setQuickReferenceCreateDraft']>[1]>().toEqualTypeOf<
      Partial<CompactQuickReferenceCreateDraft>
    >()
  })

  it('keeps controller contract draft fields aligned with shared compact draft types', () => {
    expectTypeOf<ConceptCompactControllerContract['rootCreateDraft']>().toEqualTypeOf<CompactRootCreateDraft>()
    expectTypeOf<ConceptCompactControllerContract['createDraftByParentTypeKey']>().toEqualTypeOf<
      CompactCreateDraftByParentTypeKey
    >()
    expectTypeOf<ConceptCompactControllerContract['editDraftByConceptId']>().toEqualTypeOf<
      CompactEditDraftByConceptId
    >()
    expectTypeOf<ConceptCompactControllerContract['quickReferenceCreateDraftByKey']>().toEqualTypeOf<
      CompactQuickReferenceDraftByKey
    >()
  })
})
