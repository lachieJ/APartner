import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import type {
  CompactCreateDraftByParentTypeKey,
  CompactQuickReferenceDraftByKey,
  CompactReferenceCreationOptions,
} from '../types/compactMaintenance'

export function getReferenceOptions(concepts: ConceptRecord[], referenceTypeId: string | null): ConceptRecord[] {
  if (!referenceTypeId) {
    return []
  }

  return concepts
    .filter((candidate) => candidate.concept_type_id === referenceTypeId)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function getReferenceTypeName(
  conceptTypeById: Map<string, ConceptTypeRecord>,
  referenceTypeId: string | null,
): string {
  if (!referenceTypeId) {
    return 'reference'
  }

  return conceptTypeById.get(referenceTypeId)?.name ?? referenceTypeId
}

type DeriveChildTypeNodeStateParams = {
  parentConceptId: string
  childType: ConceptTypeRecord
  concepts: ConceptRecord[]
  conceptTypeById: Map<string, ConceptTypeRecord>
  childrenByParentConceptId: Map<string, ConceptRecord[]>
  createDraftByParentTypeKey: CompactCreateDraftByParentTypeKey
  addPanelByParentTypeKey: Record<string, boolean>
  quickReferenceCreateDraftByKey: CompactQuickReferenceDraftByKey
  getDraftKey: (parentConceptId: string, childConceptTypeId: string) => string
  getReferenceCreateKeyForAdd: (parentConceptId: string, childConceptTypeId: string) => string
  getReferenceCreationParentOptions: (referenceConceptTypeId: string) => CompactReferenceCreationOptions
}

export function deriveChildTypeNodeState({
  parentConceptId,
  childType,
  concepts,
  conceptTypeById,
  childrenByParentConceptId,
  createDraftByParentTypeKey,
  addPanelByParentTypeKey,
  quickReferenceCreateDraftByKey,
  getDraftKey,
  getReferenceCreateKeyForAdd,
  getReferenceCreationParentOptions,
}: DeriveChildTypeNodeStateParams) {
  const requiredReferenceTypeId = childType.reference_to_concept_type_id
  const referenceOptions = getReferenceOptions(concepts, requiredReferenceTypeId)
  const childConcepts = (childrenByParentConceptId.get(parentConceptId) ?? []).filter(
    (childConcept) => childConcept.concept_type_id === childType.id,
  )
  const draftKey = getDraftKey(parentConceptId, childType.id)
  const createDraft = createDraftByParentTypeKey[draftKey] ?? {
    name: '',
    description: '',
    referenceToConceptId: '',
  }
  const addPanelOpen = addPanelByParentTypeKey[draftKey] ?? false
  const referenceCreatePanelKey = getReferenceCreateKeyForAdd(parentConceptId, childType.id)
  const referenceCreateDraft = quickReferenceCreateDraftByKey[referenceCreatePanelKey] ?? {
    name: '',
    description: '',
    parentConceptId: '',
  }
  const referenceCreation = requiredReferenceTypeId
    ? getReferenceCreationParentOptions(requiredReferenceTypeId)
    : { expectedParentTypeId: null, requiresParentSelection: false, parentOptions: [] }
  const requiredReferenceTypeName = getReferenceTypeName(conceptTypeById, requiredReferenceTypeId)
  const expectedParentTypeName = referenceCreation.expectedParentTypeId
    ? conceptTypeById.get(referenceCreation.expectedParentTypeId)?.name ?? referenceCreation.expectedParentTypeId
    : '(none)'

  return {
    requiredReferenceTypeId,
    referenceOptions,
    childConcepts,
    createDraft,
    addPanelOpen,
    referenceCreatePanelKey,
    referenceCreateDraft,
    referenceCreation,
    requiredReferenceTypeName,
    expectedParentTypeName,
  }
}
