import type { Dispatch, SetStateAction } from 'react'
import { useMemo } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import { orderSiblings } from '../../shared/utils/siblingOrdering'
import type { ConceptPayload, ConceptRecord } from '../types'
import type {
  CompactConceptDraft,
  CompactCreateDraftByParentTypeKey,
  CompactEditDraftByConceptId,
  CompactPendingReferenceSelection,
  CompactPendingRootSelection,
  CompactQuickReferenceCreateDraft,
  CompactQuickReferenceDraftByKey,
  CompactReferenceCreationOptions,
  CompactRootCreateDraft,
} from '../types/compactMaintenance'
import { useConceptCompactActions } from './useConceptCompactActions'
import { useConceptCompactReferences } from './useConceptCompactReferences'
import { useConceptCompactRootSelection } from './useConceptCompactRootSelection'
import { useConceptCompactUiState } from './useConceptCompactUiState'
import { getRootConceptsForType, getRootOrDecomposableConceptTypes } from '../utils/conceptConventions'

type UseConceptCompactControllerParams = {
  concepts: ConceptRecord[]
  conceptTypes: ConceptTypeRecord[]
  conceptTypeById: Map<string, ConceptTypeRecord>
  conceptById: Map<string, ConceptRecord>
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
  onUpdateConcept: (id: string, payload: ConceptPayload) => Promise<boolean>
}

export type ConceptCompactControllerContract = {
  selectedRootTypeId: string
  setSelectedRootTypeId: (value: string) => void
  selectedRootConceptId: string
  setSelectedRootConceptId: (value: string) => void
  showEditControls: boolean
  setShowEditControlsWithReset: (nextValue: boolean) => void
  rootCreateDraft: CompactRootCreateDraft
  setRootCreateDraft: Dispatch<SetStateAction<CompactRootCreateDraft>>
  addPanelByParentTypeKey: Record<string, boolean>
  setAddPanelByParentTypeKey: Dispatch<SetStateAction<Record<string, boolean>>>
  createDraftByParentTypeKey: CompactCreateDraftByParentTypeKey
  setCreateDraftByParentTypeKey: Dispatch<SetStateAction<CompactCreateDraftByParentTypeKey>>
  editPanelByConceptId: Record<string, boolean>
  setEditPanelByConceptId: Dispatch<SetStateAction<Record<string, boolean>>>
  editDraftByConceptId: CompactEditDraftByConceptId
  setEditDraftByConceptId: Dispatch<SetStateAction<CompactEditDraftByConceptId>>
  quickReferenceCreatePanelByKey: Record<string, boolean>
  quickReferenceCreateDraftByKey: CompactQuickReferenceDraftByKey
  pendingRootSelection: CompactPendingRootSelection | null
  setPendingRootSelection: Dispatch<SetStateAction<CompactPendingRootSelection | null>>
  pendingReferenceSelectionByKey: Record<string, CompactPendingReferenceSelection>
  setPendingReferenceSelectionByKey: Dispatch<SetStateAction<Record<string, CompactPendingReferenceSelection>>>
  getDraftKey: (parentConceptId: string, childConceptTypeId: string) => string
  setCreateDraft: (parentConceptId: string, childConceptTypeId: string, next: Partial<CompactConceptDraft>) => void
  clearCreateDraft: (parentConceptId: string, childConceptTypeId: string) => void
  toggleAddPanel: (parentConceptId: string, childConceptTypeId: string) => void
  openEditPanel: (concept: ConceptRecord) => void
  closeEditPanel: (conceptId: string) => void
  setEditDraft: (conceptId: string, next: Partial<CompactConceptDraft>) => void
  getReferenceCreateKeyForEdit: (conceptId: string) => string
  getReferenceCreateKeyForAdd: (parentConceptId: string, childConceptTypeId: string) => string
  getPendingSelectionKeyForEdit: (conceptId: string) => string
  getPendingSelectionKeyForAdd: (parentConceptId: string, childConceptTypeId: string) => string
  setQuickReferenceCreateDraft: (panelKey: string, next: Partial<CompactQuickReferenceCreateDraft>) => void
  toggleQuickReferenceCreatePanel: (panelKey: string) => void
  clearQuickReferenceCreateDraft: (panelKey: string) => void
  closeQuickReferenceCreatePanel: (panelKey: string) => void
  rootOrDecomposableTypes: ConceptTypeRecord[]
  childTypesByParentTypeId: Map<string, ConceptTypeRecord[]>
  childrenByParentConceptId: Map<string, ConceptRecord[]>
  rootConceptOptions: ConceptRecord[]
  selectedRootType: ConceptTypeRecord | null
  selectedRootConcept: ConceptRecord | null
  getReferenceCreationParentOptions: (referenceConceptTypeId: string) => CompactReferenceCreationOptions
  handleCreateReferenceConcept: (referenceConceptTypeId: string, panelKey: string) => Promise<void>
  handleAddRootInstance: () => Promise<void>
  handleAddChildInstance: (parentConceptId: string, childConceptTypeId: string) => Promise<void>
  handleSaveConceptEdit: (concept: ConceptRecord) => Promise<void>
}

export type ConceptCompactViewControllerContract = Pick<
  ConceptCompactControllerContract,
  | 'selectedRootTypeId'
  | 'setSelectedRootTypeId'
  | 'selectedRootConceptId'
  | 'setSelectedRootConceptId'
  | 'showEditControls'
  | 'setShowEditControlsWithReset'
  | 'rootCreateDraft'
  | 'setRootCreateDraft'
  | 'addPanelByParentTypeKey'
  | 'createDraftByParentTypeKey'
  | 'editPanelByConceptId'
  | 'editDraftByConceptId'
  | 'quickReferenceCreatePanelByKey'
  | 'quickReferenceCreateDraftByKey'
  | 'getDraftKey'
  | 'setCreateDraft'
  | 'toggleAddPanel'
  | 'openEditPanel'
  | 'closeEditPanel'
  | 'setEditDraft'
  | 'getReferenceCreateKeyForEdit'
  | 'getReferenceCreateKeyForAdd'
  | 'setQuickReferenceCreateDraft'
  | 'toggleQuickReferenceCreatePanel'
  | 'closeQuickReferenceCreatePanel'
  | 'rootOrDecomposableTypes'
  | 'childTypesByParentTypeId'
  | 'childrenByParentConceptId'
  | 'rootConceptOptions'
  | 'selectedRootType'
  | 'selectedRootConcept'
  | 'getReferenceCreationParentOptions'
  | 'handleCreateReferenceConcept'
  | 'handleAddRootInstance'
  | 'handleAddChildInstance'
  | 'handleSaveConceptEdit'
>

export function useConceptCompactController({
  concepts,
  conceptTypes,
  conceptTypeById,
  conceptById,
  onCreateConcept,
  onUpdateConcept,
}: UseConceptCompactControllerParams): ConceptCompactControllerContract {
  const uiState = useConceptCompactUiState()

  const rootOrDecomposableTypes = useMemo(() => getRootOrDecomposableConceptTypes(conceptTypes), [conceptTypes])

  const childTypesByParentTypeId = useMemo(() => {
    const children = new Map<string, ConceptTypeRecord[]>()

    for (const conceptType of conceptTypes) {
      if (!conceptType.part_of_concept_type_id) {
        continue
      }

      const values = children.get(conceptType.part_of_concept_type_id) ?? []
      values.push(conceptType)
      children.set(conceptType.part_of_concept_type_id, values)
    }

    for (const [parentTypeId, values] of children) {
      children.set(parentTypeId, orderSiblings(values))
    }

    return children
  }, [conceptTypes])

  const childrenByParentConceptId = useMemo(() => {
    const children = new Map<string, ConceptRecord[]>()

    for (const concept of concepts) {
      if (!concept.part_of_concept_id) {
        continue
      }

      const siblings = children.get(concept.part_of_concept_id) ?? []
      siblings.push(concept)
      children.set(concept.part_of_concept_id, siblings)
    }

    for (const [parentConceptId, siblings] of children) {
      siblings.sort((left, right) => {
        const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
        const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder
        }

        return left.name.localeCompare(right.name)
      })
      children.set(parentConceptId, siblings)
    }

    return children
  }, [concepts])

  const rootConceptOptions = useMemo(
    () => getRootConceptsForType(concepts, uiState.selectedRootTypeId),
    [concepts, uiState.selectedRootTypeId],
  )

  const selectedRootType = uiState.selectedRootTypeId ? conceptTypeById.get(uiState.selectedRootTypeId) ?? null : null
  const selectedRootConcept = uiState.selectedRootConceptId
    ? conceptById.get(uiState.selectedRootConceptId) ?? null
    : null

  const { handleAddRootInstance } = useConceptCompactRootSelection({
    concepts,
    selectedRootTypeId: uiState.selectedRootTypeId,
    rootCreateDraft: uiState.rootCreateDraft,
    pendingRootSelection: uiState.pendingRootSelection,
    setPendingRootSelection: uiState.setPendingRootSelection,
    setRootCreateDraft: uiState.setRootCreateDraft,
    setSelectedRootTypeId: uiState.setSelectedRootTypeId,
    setSelectedRootConceptId: uiState.setSelectedRootConceptId,
    onCreateConcept,
  })

  const { getReferenceCreationParentOptions, handleCreateReferenceConcept } = useConceptCompactReferences({
    concepts,
    conceptTypeById,
    quickReferenceCreateDraftByKey: uiState.quickReferenceCreateDraftByKey,
    pendingReferenceSelectionByKey: uiState.pendingReferenceSelectionByKey,
    setPendingReferenceSelectionByKey: uiState.setPendingReferenceSelectionByKey,
    setCreateDraftByParentTypeKey: uiState.setCreateDraftByParentTypeKey,
    setEditDraftByConceptId: uiState.setEditDraftByConceptId,
    clearQuickReferenceCreateDraft: uiState.clearQuickReferenceCreateDraft,
    closeQuickReferenceCreatePanel: uiState.closeQuickReferenceCreatePanel,
    onCreateConcept,
  })

  const { handleAddChildInstance, handleSaveConceptEdit } = useConceptCompactActions({
    createDraftByParentTypeKey: uiState.createDraftByParentTypeKey,
    editDraftByConceptId: uiState.editDraftByConceptId,
    getDraftKey: uiState.getDraftKey,
    clearCreateDraft: uiState.clearCreateDraft,
    closeEditPanel: uiState.closeEditPanel,
    setAddPanelByParentTypeKey: uiState.setAddPanelByParentTypeKey,
    onCreateConcept,
    onUpdateConcept,
  })

  const controller: ConceptCompactControllerContract = {
    ...uiState,
    rootOrDecomposableTypes,
    childTypesByParentTypeId,
    childrenByParentConceptId,
    rootConceptOptions,
    selectedRootType,
    selectedRootConcept,
    getReferenceCreationParentOptions,
    handleCreateReferenceConcept,
    handleAddRootInstance,
    handleAddChildInstance,
    handleSaveConceptEdit,
  }

  return controller
}
