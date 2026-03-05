import { useEffect, useMemo } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import { useConceptCompactController } from '../hooks/useConceptCompactController'
import { ConceptCompactBranch, type BranchActionsContract, type BranchDataContract, type BranchDraftActionsContract, type BranchUiContract, type ConceptCompactBranchContract } from './ConceptCompactBranch'
import { ConceptCompactBranchProvider } from './ConceptCompactBranchProvider'
import { ConceptCompactChildTypeNode } from './ConceptCompactChildTypeNode'
import { ConceptCompactEditPanel } from './ConceptCompactInlinePanels'
import { deriveChildTypeNodeState, getReferenceOptions, getReferenceTypeName } from '../utils/conceptCompactBranchHelpers'
import type { ConceptPayload, ConceptRecord } from '../types'

type ConceptValueStreamWindowProps = {
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
}

export function ConceptValueStreamWindow({
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
}: ConceptValueStreamWindowProps) {
  const compactController = useConceptCompactController({
    concepts,
    conceptTypes,
    conceptTypeById,
    conceptById,
    onCreateConcept,
    onUpdateConcept,
    onCopyConceptModelFromRoot: async () => {},
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
    childTypesByParentTypeId,
    childrenByParentConceptId,
    selectedRootConcept,
    getReferenceCreationParentOptions,
    handleCreateReferenceConcept,
    handleAddRootInstance,
    handleAddChildInstance,
    handleSaveConceptEdit,
  } = compactController

  const valueStreamType = useMemo(
    () => conceptTypes.find((conceptType) => normalizeName(conceptType.name) === VALUE_STREAM_TYPE_NAME) ?? null,
    [conceptTypes],
  )

  const valueStreamOptions = useMemo(() => {
    if (!valueStreamType) {
      return []
    }

    return concepts
      .filter((concept) => concept.concept_type_id === valueStreamType.id && !concept.part_of_concept_id)
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [concepts, valueStreamType])

  useEffect(() => {
    if (!valueStreamType) {
      return
    }

    if (selectedRootTypeId !== valueStreamType.id) {
      setSelectedRootTypeId(valueStreamType.id)
      setSelectedRootConceptId('')
    }
  }, [selectedRootTypeId, setSelectedRootConceptId, setSelectedRootTypeId, valueStreamType])

  useEffect(() => {
    if (selectedRootConceptId) {
      return
    }

    if (!valueStreamOptions[0]) {
      return
    }

    setSelectedRootConceptId(valueStreamOptions[0].id)
  }, [selectedRootConceptId, setSelectedRootConceptId, valueStreamOptions])

  const selectedValueStream = useMemo(() => {
    if (!valueStreamType) {
      return null
    }

    if (selectedRootConcept && selectedRootConcept.concept_type_id === valueStreamType.id) {
      return selectedRootConcept
    }

    return valueStreamOptions.find((concept) => concept.id === selectedRootConceptId) ?? null
  }, [selectedRootConcept, selectedRootConceptId, valueStreamOptions, valueStreamType])

  const valueStreamChildTypes = useMemo(
    () => (valueStreamType ? childTypesByParentTypeId.get(valueStreamType.id) ?? [] : []),
    [childTypesByParentTypeId, valueStreamType],
  )

  const valueStreamStageType = useMemo(
    () => valueStreamChildTypes.find((childType) => normalizeName(childType.name) === VALUE_STREAM_STAGE_TYPE_NAME) ?? null,
    [valueStreamChildTypes],
  )

  const valueStreamRelatedTopTypes = useMemo(
    () => valueStreamChildTypes.filter((childType) => childType.id !== valueStreamStageType?.id),
    [valueStreamChildTypes, valueStreamStageType?.id],
  )

  const valueStreamChildren = useMemo(
    () => (selectedValueStream ? childrenByParentConceptId.get(selectedValueStream.id) ?? [] : []),
    [childrenByParentConceptId, selectedValueStream],
  )

  const stageConcepts = useMemo(() => {
    if (!valueStreamStageType) {
      return []
    }

    return valueStreamChildren.filter((concept) => concept.concept_type_id === valueStreamStageType.id)
  }, [valueStreamChildren, valueStreamStageType])

  const stageDetailTypes = useMemo(
    () => (valueStreamStageType ? childTypesByParentTypeId.get(valueStreamStageType.id) ?? [] : []),
    [childTypesByParentTypeId, valueStreamStageType],
  )

  const stageHeaderLabel = valueStreamStageType?.name ?? 'Stage'
  const stageDetailsHeaderLabel =
    stageDetailTypes.length > 0
      ? stageDetailTypes.map((detailType) => detailType.name).join(' · ')
      : 'Actions and details'

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
      maxTreeDepth: null,
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

  const renderEditPanel = (concept: ConceptRecord) => {
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
      referenceToConceptId: editDraftByConceptId[concept.id]?.referenceToConceptId ?? concept.reference_to_concept_id ?? '',
    }
    const editExpectedParentTypeName = editReferenceCreation.expectedParentTypeId
      ? conceptTypeById.get(editReferenceCreation.expectedParentTypeId)?.name ?? editReferenceCreation.expectedParentTypeId
      : '(none)'

    return (
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
    )
  }

  if (!valueStreamType) {
    return <p className="hint">ConceptType &quot;Value Stream&quot; was not found.</p>
  }

  return (
    <div className="valueStreamWindow">
      <aside className="sidePanel">
        <h3>Value Stream Details</h3>
        <p>{selectedValueStream?.name || 'No value stream selected'}</p>
        <button onClick={() => handleAddRootInstance()}>Add Value Stream</button>
      </aside>
      <main className="mainContent">
        <h2>{selectedValueStream?.name || 'Value Stream'}</h2>
        <div className="stages">
          {stageConcepts.map((stage) => (
            <div key={stage.id} className="stage">
              <h3>{stage.name}</h3>
              <p>{stage.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}