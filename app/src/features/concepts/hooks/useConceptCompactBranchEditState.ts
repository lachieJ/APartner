import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import type {
  CompactEditDraftByConceptId,
  CompactQuickReferenceDraftByKey,
  CompactReferenceCreationOptions,
} from '../types/compactMaintenance'
import { getReferenceOptions, getReferenceTypeName } from '../utils/conceptCompactBranchHelpers'

type UseConceptCompactBranchEditStateParams = {
  concept: ConceptRecord
  concepts: ConceptRecord[]
  conceptTypeById: Map<string, ConceptTypeRecord>
  editDraftByConceptId: CompactEditDraftByConceptId
  quickReferenceCreateDraftByKey: CompactQuickReferenceDraftByKey
  getReferenceCreateKeyForEdit: (conceptId: string) => string
  getReferenceCreationParentOptions: (referenceConceptTypeId: string) => CompactReferenceCreationOptions
}

export function useConceptCompactBranchEditState({
  concept,
  concepts,
  conceptTypeById,
  editDraftByConceptId,
  quickReferenceCreateDraftByKey,
  getReferenceCreateKeyForEdit,
  getReferenceCreationParentOptions,
}: UseConceptCompactBranchEditStateParams) {
  const conceptTypeForEdit = conceptTypeById.get(concept.concept_type_id)
  const editRequiredReferenceTypeId = conceptTypeForEdit?.reference_to_concept_type_id ?? null
  const editReferenceOptions = getReferenceOptions(concepts, editRequiredReferenceTypeId)
  const editReferenceCreatePanelKey = getReferenceCreateKeyForEdit(concept.id)
  const editReferenceCreateDraft = quickReferenceCreateDraftByKey[editReferenceCreatePanelKey] ?? {
    name: '',
    description: '',
    parentConceptId: '',
  }
  const editReferenceCreation = editRequiredReferenceTypeId
    ? getReferenceCreationParentOptions(editRequiredReferenceTypeId)
    : { expectedParentTypeId: null, requiresParentSelection: false, parentOptions: [] }
  const editRequiredReferenceTypeName = getReferenceTypeName(conceptTypeById, editRequiredReferenceTypeId)
  const editDraft = {
    name: editDraftByConceptId[concept.id]?.name ?? concept.name,
    description: editDraftByConceptId[concept.id]?.description ?? concept.description ?? '',
    referenceToConceptId:
      editDraftByConceptId[concept.id]?.referenceToConceptId ?? concept.reference_to_concept_id ?? '',
  }
  const editExpectedParentTypeName = editReferenceCreation.expectedParentTypeId
    ? conceptTypeById.get(editReferenceCreation.expectedParentTypeId)?.name ?? editReferenceCreation.expectedParentTypeId
    : '(none)'

  return {
    editRequiredReferenceTypeId,
    editReferenceOptions,
    editReferenceCreatePanelKey,
    editReferenceCreateDraft,
    editReferenceCreation,
    editRequiredReferenceTypeName,
    editDraft,
    editExpectedParentTypeName,
  }
}
