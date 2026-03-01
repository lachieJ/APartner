import type { Dispatch, SetStateAction } from 'react'
import type { ConceptPayload, ConceptRecord } from '../types'
import type { CompactCreateDraftByParentTypeKey, CompactEditDraftByConceptId } from '../types/compactMaintenance'

type UseConceptCompactActionsParams = {
  createDraftByParentTypeKey: CompactCreateDraftByParentTypeKey
  editDraftByConceptId: CompactEditDraftByConceptId
  getDraftKey: (parentConceptId: string, childConceptTypeId: string) => string
  clearCreateDraft: (parentConceptId: string, childConceptTypeId: string) => void
  closeEditPanel: (conceptId: string) => void
  setAddPanelByParentTypeKey: Dispatch<SetStateAction<Record<string, boolean>>>
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
  onUpdateConcept: (id: string, payload: ConceptPayload) => Promise<boolean>
}

export function useConceptCompactActions({
  createDraftByParentTypeKey,
  editDraftByConceptId,
  getDraftKey,
  clearCreateDraft,
  closeEditPanel,
  setAddPanelByParentTypeKey,
  onCreateConcept,
  onUpdateConcept,
}: UseConceptCompactActionsParams) {
  const handleAddChildInstance = async (parentConceptId: string, childConceptTypeId: string) => {
    const key = getDraftKey(parentConceptId, childConceptTypeId)
    const draft = createDraftByParentTypeKey[key] ?? { name: '', description: '', referenceToConceptId: '' }
    const name = draft.name.trim()
    if (!name) {
      return
    }

    const success = await onCreateConcept({
      name,
      description: draft.description.trim() ? draft.description.trim() : null,
      concept_type_id: childConceptTypeId,
      part_of_concept_id: parentConceptId,
      part_order: null,
      reference_to_concept_id: draft.referenceToConceptId || null,
    })

    if (success) {
      clearCreateDraft(parentConceptId, childConceptTypeId)
      setAddPanelByParentTypeKey((previous) => ({
        ...previous,
        [key]: false,
      }))
    }
  }

  const handleSaveConceptEdit = async (concept: ConceptRecord) => {
    const draft = editDraftByConceptId[concept.id] ?? {
      name: concept.name,
      description: concept.description ?? '',
      referenceToConceptId: concept.reference_to_concept_id ?? '',
    }

    const nextName = draft.name.trim()
    if (!nextName) {
      return
    }

    const success = await onUpdateConcept(concept.id, {
      name: nextName,
      description: draft.description.trim() ? draft.description.trim() : null,
      concept_type_id: concept.concept_type_id,
      part_of_concept_id: concept.part_of_concept_id,
      part_order: concept.part_order,
      reference_to_concept_id: draft.referenceToConceptId || null,
    })

    if (success) {
      closeEditPanel(concept.id)
    }
  }

  return {
    handleAddChildInstance,
    handleSaveConceptEdit,
  }
}
