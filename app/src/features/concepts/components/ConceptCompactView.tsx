import { useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptPayload, ConceptRecord } from '../types'
import {
  type ConceptCompactViewControllerContract,
  useConceptCompactController,
} from '../hooks/useConceptCompactController'
import {
  ConceptCompactBranch,
  type BranchActionsContract,
  type ConceptCompactBranchContract,
  type BranchDataContract,
  type BranchDraftActionsContract,
  type BranchUiContract,
} from './ConceptCompactBranch'
import { ConceptCompactBranchProvider } from './ConceptCompactBranchProvider'
import { ConceptCompactControls } from './ConceptCompactControls'

type ConceptCompactViewProps = {
  concepts: ConceptRecord[]
  conceptTypes: ConceptTypeRecord[]
  conceptTypeById: Map<string, ConceptTypeRecord>
  conceptById: Map<string, ConceptRecord>
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
  onUpdateConcept: (id: string, payload: ConceptPayload) => Promise<boolean>
  onDeleteConcept: (id: string) => void
  movingConceptId: string | null
  onMoveConceptWithinParent: (id: string, direction: 'up' | 'down') => Promise<void>
  onNormalizeSiblingOrders: () => Promise<void>
  disableNormalizeSiblingOrders: boolean
}

export function ConceptCompactView({
  concepts,
  conceptTypes,
  conceptTypeById,
  conceptById,
  onCreateConcept,
  onUpdateConcept,
  onDeleteConcept,
  movingConceptId,
  onMoveConceptWithinParent,
  onNormalizeSiblingOrders,
  disableNormalizeSiblingOrders,
}: ConceptCompactViewProps) {
  const [maxTreeDepth, setMaxTreeDepth] = useState<number | null>(null)

  const compactViewController: ConceptCompactViewControllerContract = useConceptCompactController({
    concepts,
    conceptTypes,
    conceptTypeById,
    conceptById,
    onCreateConcept,
    onUpdateConcept,
  })

  const {
    selectedRootTypeId,
    setSelectedRootTypeId,
    selectedRootConceptId,
    setSelectedRootConceptId,
    showEditControls,
    setShowEditControlsWithReset,
    rootCreateDraft,
    setRootCreateDraft,
    addPanelByParentTypeKey,
    createDraftByParentTypeKey,
    editPanelByConceptId,
    editDraftByConceptId,
    quickReferenceCreatePanelByKey,
    quickReferenceCreateDraftByKey,
    getDraftKey,
    setCreateDraft,
    toggleAddPanel,
    openEditPanel,
    closeEditPanel,
    setEditDraft,
    getReferenceCreateKeyForEdit,
    getReferenceCreateKeyForAdd,
    setQuickReferenceCreateDraft,
    toggleQuickReferenceCreatePanel,
    closeQuickReferenceCreatePanel,
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
  } = compactViewController

  const branchData = useMemo<BranchDataContract>(
    () => ({
      concepts,
      conceptTypeById,
      conceptById,
      childTypesByParentTypeId,
      childrenByParentConceptId,
    }),
    [concepts, conceptTypeById, conceptById, childTypesByParentTypeId, childrenByParentConceptId],
  )

  const branchUi = useMemo<BranchUiContract>(
    () => ({
      showEditControls,
      addPanelByParentTypeKey,
      createDraftByParentTypeKey,
      editPanelByConceptId,
      editDraftByConceptId,
      quickReferenceCreatePanelByKey,
      quickReferenceCreateDraftByKey,
      movingConceptId,
      maxTreeDepth,
    }),
    [
      showEditControls,
      addPanelByParentTypeKey,
      createDraftByParentTypeKey,
      editPanelByConceptId,
      editDraftByConceptId,
      quickReferenceCreatePanelByKey,
      quickReferenceCreateDraftByKey,
      movingConceptId,
      maxTreeDepth,
    ],
  )

  const branchDraftActions = useMemo<BranchDraftActionsContract>(
    () => ({
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
    }),
    [
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
    ],
  )

  const branchActions = useMemo<BranchActionsContract>(
    () => ({
      getReferenceCreationParentOptions,
      handleCreateReferenceConcept,
      handleSaveConceptEdit,
      handleAddChildInstance,
      handleDeleteConcept: onDeleteConcept,
      handleMoveConceptWithinParent: onMoveConceptWithinParent,
    }),
    [
      getReferenceCreationParentOptions,
      handleCreateReferenceConcept,
      handleSaveConceptEdit,
      handleAddChildInstance,
      onDeleteConcept,
      onMoveConceptWithinParent,
    ],
  )

  const branchContract = useMemo<ConceptCompactBranchContract>(
    () => ({
      data: branchData,
      ui: branchUi,
      draftActions: branchDraftActions,
      actions: branchActions,
    }),
    [branchData, branchUi, branchDraftActions, branchActions],
  )

  return (
    <div className="maintainInlineForm">
      <ConceptCompactControls
        selectedRootTypeId={selectedRootTypeId}
        selectedRootConceptId={selectedRootConceptId}
        showEditControls={showEditControls}
        rootCreateDraft={rootCreateDraft}
        rootOrDecomposableTypes={rootOrDecomposableTypes}
        rootConceptOptions={rootConceptOptions}
        selectedRootType={selectedRootType}
        maxTreeDepth={maxTreeDepth}
        onSetSelectedRootTypeId={setSelectedRootTypeId}
        onSetSelectedRootConceptId={setSelectedRootConceptId}
        onSetMaxTreeDepth={setMaxTreeDepth}
        onSetShowEditControls={setShowEditControlsWithReset}
        onSetRootCreateDraft={setRootCreateDraft}
        onAddRootInstance={handleAddRootInstance}
        onNormalizeSiblingOrders={onNormalizeSiblingOrders}
        disableNormalizeSiblingOrders={disableNormalizeSiblingOrders}
      />

      {selectedRootType && selectedRootConcept ? (
        <ConceptCompactBranchProvider value={branchContract}>
          <ul className="treeList">
            <li className="treeNode">
              <div className="treeCompactRow treeTypeRow">
                <p>{selectedRootType.name}</p>
              </div>
              <ul className="treeList">
                <ConceptCompactBranch
                  concept={selectedRootConcept}
                  visited={new Set()}
                  currentDepth={0}
                />
              </ul>
            </li>
          </ul>
        </ConceptCompactBranchProvider>
      ) : null}
    </div>
  )
}
