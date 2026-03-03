import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import { useConceptCompactBranchEditState } from '../hooks/useConceptCompactBranchEditState'
import type {
  CompactConceptDraft,
  CompactCreateDraftByParentTypeKey,
  CompactEditDraftByConceptId,
  CompactQuickReferenceCreateDraft,
  CompactQuickReferenceDraftByKey,
  CompactReferenceCreationOptions,
} from '../types/compactMaintenance'
import { ConceptCompactChildTypeNode } from './ConceptCompactChildTypeNode'
import { ConceptCompactEditPanel } from './ConceptCompactInlinePanels'
import { deriveChildTypeNodeState } from '../utils/conceptCompactBranchHelpers'
import { useConceptCompactBranchContract } from '../hooks/useConceptCompactBranchContext'

export type BranchDataContract = {
  concepts: ConceptRecord[]
  conceptTypeById: Map<string, ConceptTypeRecord>
  conceptById: Map<string, ConceptRecord>
  childTypesByParentTypeId: Map<string, ConceptTypeRecord[]>
  childrenByParentConceptId: Map<string, ConceptRecord[]>
}

export type BranchUiContract = {
  showEditControls: boolean
  addPanelByParentTypeKey: Record<string, boolean>
  createDraftByParentTypeKey: CompactCreateDraftByParentTypeKey
  editPanelByConceptId: Record<string, boolean>
  editDraftByConceptId: CompactEditDraftByConceptId
  quickReferenceCreatePanelByKey: Record<string, boolean>
  quickReferenceCreateDraftByKey: CompactQuickReferenceDraftByKey
  movingConceptId: string | null
  maxTreeDepth: number | null
}

export type BranchDraftActionsContract = {
  getDraftKey: (parentConceptId: string, childConceptTypeId: string) => string
  getReferenceCreateKeyForEdit: (conceptId: string) => string
  getReferenceCreateKeyForAdd: (parentConceptId: string, childConceptTypeId: string) => string
  openEditPanel: (concept: ConceptRecord) => void
  closeEditPanel: (conceptId: string) => void
  setEditDraft: (
    conceptId: string,
    next: Partial<CompactConceptDraft>,
  ) => void
  setCreateDraft: (
    parentConceptId: string,
    childConceptTypeId: string,
    next: Partial<CompactConceptDraft>,
  ) => void
  toggleAddPanel: (parentConceptId: string, childConceptTypeId: string) => void
  toggleQuickReferenceCreatePanel: (panelKey: string) => void
  setQuickReferenceCreateDraft: (
    panelKey: string,
    next: Partial<CompactQuickReferenceCreateDraft>,
  ) => void
  closeQuickReferenceCreatePanel: (panelKey: string) => void
}

export type BranchActionsContract = {
  getReferenceCreationParentOptions: (referenceConceptTypeId: string) => CompactReferenceCreationOptions
  handleCreateReferenceConcept: (referenceConceptTypeId: string, panelKey: string) => Promise<void>
  handleSaveConceptEdit: (concept: ConceptRecord) => Promise<void>
  handleAddChildInstance: (parentConceptId: string, childConceptTypeId: string) => Promise<void>
  handleDeleteConcept: (conceptId: string) => void
  handleMoveConceptWithinParent: (conceptId: string, direction: 'up' | 'down') => Promise<void>
}

export type ConceptCompactBranchContract = {
  data: BranchDataContract
  ui: BranchUiContract
  draftActions: BranchDraftActionsContract
  actions: BranchActionsContract
}

type ConceptCompactBranchProps = {
  concept: ConceptRecord
  visited: Set<string>
  currentDepth?: number
}

export function ConceptCompactBranch({
  concept,
  visited,
  currentDepth = 0,
}: ConceptCompactBranchProps): JSX.Element {
  const { data, ui, draftActions, actions } = useConceptCompactBranchContract()
  const { concepts, conceptTypeById, conceptById, childTypesByParentTypeId, childrenByParentConceptId } = data
  const {
    showEditControls,
    addPanelByParentTypeKey,
    createDraftByParentTypeKey,
    editPanelByConceptId,
    editDraftByConceptId,
    quickReferenceCreatePanelByKey,
    quickReferenceCreateDraftByKey,
    movingConceptId,
    maxTreeDepth,
  } = ui
  const {
    getDraftKey,
    getReferenceCreateKeyForEdit,
    getReferenceCreateKeyForAdd,
    openEditPanel,
    closeEditPanel,
    setEditDraft,
    setCreateDraft,
    toggleAddPanel,
    toggleQuickReferenceCreatePanel,
    setQuickReferenceCreateDraft,
    closeQuickReferenceCreatePanel,
  } = draftActions
  const {
    getReferenceCreationParentOptions,
    handleCreateReferenceConcept,
    handleSaveConceptEdit,
    handleAddChildInstance,
    handleDeleteConcept,
    handleMoveConceptWithinParent,
  } = actions

  const conceptType = conceptTypeById.get(concept.concept_type_id)
  const referenceTarget = concept.reference_to_concept_id
    ? conceptById.get(concept.reference_to_concept_id) ?? null
    : null

  const {
    editRequiredReferenceTypeId,
    editReferenceOptions,
    editReferenceCreatePanelKey,
    editReferenceCreateDraft,
    editReferenceCreation,
    editRequiredReferenceTypeName,
    editDraft,
    editExpectedParentTypeName,
  } = useConceptCompactBranchEditState({
    concept,
    concepts,
    conceptTypeById,
    editDraftByConceptId,
    quickReferenceCreateDraftByKey,
    getReferenceCreateKeyForEdit,
    getReferenceCreationParentOptions,
  })

  if (visited.has(concept.id)) {
    return (
      <li key={`cycle-${concept.id}`} className="treeNode">
        <p>{concept.name}</p>
        <p className="hint">Cycle detected in PartOf path; expansion stopped.</p>
      </li>
    )
  }

  const nextVisited = new Set(visited)
  nextVisited.add(concept.id)

  const childTypes = (childTypesByParentTypeId.get(concept.concept_type_id) ?? []).filter(
    (childType) => childType.id !== concept.concept_type_id || conceptType?.part_of_concept_type_id === conceptType?.id,
  )

  const siblingConcepts = concept.part_of_concept_id
    ? childrenByParentConceptId.get(concept.part_of_concept_id) ?? []
    : []
  const siblingIndex = siblingConcepts.findIndex((sibling) => sibling.id === concept.id)
  const canMoveUp = Boolean(concept.part_of_concept_id) && siblingIndex > 0
  const canMoveDown = Boolean(concept.part_of_concept_id) && siblingIndex >= 0 && siblingIndex < siblingConcepts.length - 1
  const isMoveInProgress = Boolean(movingConceptId)
  const canRenderChildrenByDepth = maxTreeDepth === null || currentDepth < maxTreeDepth

  return (
    <li key={concept.id} className="treeNode">
      <div className="treeCompactRow">
        <p>{concept.name}</p>
        {showEditControls ? (
          <div className="actions">
            <button
              type="button"
              onClick={() => {
                void handleMoveConceptWithinParent(concept.id, 'up')
              }}
              disabled={!canMoveUp || isMoveInProgress}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => {
                void handleMoveConceptWithinParent(concept.id, 'down')
              }}
              disabled={!canMoveDown || isMoveInProgress}
            >
              ↓
            </button>
            <button type="button" onClick={() => openEditPanel(concept)}>
              Edit
            </button>
            <button type="button" onClick={() => handleDeleteConcept(concept.id)} disabled={isMoveInProgress}>
              Delete
            </button>
          </div>
        ) : null}
      </div>
      {showEditControls && editPanelByConceptId[concept.id] ? (
        <ConceptCompactEditPanel
          data={{
            editDraft,
            requiredReferenceTypeId: editRequiredReferenceTypeId,
            requiredReferenceTypeName: editRequiredReferenceTypeName,
            referenceOptions: editReferenceOptions,
            referenceCreatePanelKey: editReferenceCreatePanelKey,
            referenceCreateDraft: editReferenceCreateDraft,
            referenceCreation: editReferenceCreation,
            expectedParentTypeName: editExpectedParentTypeName,
          }}
          ui={{
            referenceCreatePanelOpen: quickReferenceCreatePanelByKey[editReferenceCreatePanelKey] ?? false,
          }}
          actions={{
            onSetEditDraft: (next) => setEditDraft(concept.id, next),
            onToggleQuickReferenceCreatePanel: toggleQuickReferenceCreatePanel,
            onSetQuickReferenceCreateDraft: setQuickReferenceCreateDraft,
            onCreateReferenceConcept: (referenceTypeId, panelKey) => {
              void handleCreateReferenceConcept(referenceTypeId, panelKey)
            },
            onCloseQuickReferenceCreatePanel: closeQuickReferenceCreatePanel,
            onSave: () => {
              void handleSaveConceptEdit(concept)
            },
            onCancel: () => closeEditPanel(concept.id),
          }}
        />
      ) : null}
      {referenceTarget ? (
        <p className="meta">
          Refers to: {referenceTarget.name}
          {` (${conceptTypeById.get(referenceTarget.concept_type_id)?.name ?? referenceTarget.concept_type_id})`}
        </p>
      ) : null}

      {canRenderChildrenByDepth && childTypes.length > 0 ? (
        <ul className="treeList">
          {childTypes.map((childType) => {
            const {
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
            } = deriveChildTypeNodeState({
              parentConceptId: concept.id,
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
            })
            const childConceptNodes = childConcepts.map((childConcept) => (
              <ConceptCompactBranch
                key={childConcept.id}
                concept={childConcept}
                visited={nextVisited}
                currentDepth={currentDepth + 1}
              />
            ))

            return (
              <ConceptCompactChildTypeNode
                key={`${concept.id}-${childType.id}`}
                data={{
                  childType,
                  createDraft,
                  requiredReferenceTypeId,
                  requiredReferenceTypeName,
                  referenceOptions,
                  referenceCreatePanelKey,
                  referenceCreateDraft,
                  referenceCreation,
                  expectedParentTypeName,
                  childConceptNodes,
                }}
                ui={{
                  showEditControls,
                  addPanelOpen,
                  referenceCreatePanelOpen: quickReferenceCreatePanelByKey[referenceCreatePanelKey] ?? false,
                }}
                actions={{
                  onToggleAddPanel: () => toggleAddPanel(concept.id, childType.id),
                  onSetCreateDraft: (next) => setCreateDraft(concept.id, childType.id, next),
                  onToggleQuickReferenceCreatePanel: toggleQuickReferenceCreatePanel,
                  onSetQuickReferenceCreateDraft: setQuickReferenceCreateDraft,
                  onCreateReferenceConcept: (referenceTypeId, panelKey) => {
                    void handleCreateReferenceConcept(referenceTypeId, panelKey)
                  },
                  onCloseQuickReferenceCreatePanel: closeQuickReferenceCreatePanel,
                  onAddChild: () => {
                    void handleAddChildInstance(concept.id, childType.id)
                  },
                }}
              />
            )
          })}
        </ul>
      ) : null}
    </li>
  )
}
