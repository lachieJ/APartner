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

const VALUE_STREAM_TYPE_NAME = 'value stream'
const VALUE_STREAM_STAGE_TYPE_NAME = 'value stream stage'

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase()
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
    <ConceptCompactBranchProvider value={branchContract}>
      <p className="meta">Value Stream maintenance (v1)</p>
      <div className="viewControls">
        <label>
          Value Stream
          <select value={selectedRootConceptId} onChange={(event) => setSelectedRootConceptId(event.target.value)}>
            <option value="">(select)</option>
            {valueStreamOptions.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name} ({concept.id})
              </option>
            ))}
          </select>
        </label>

        <label className="inlineToggle">
          <input
            type="checkbox"
            checked={showEditControls}
            onChange={(event) => {
              setShowEditControlsWithReset(event.target.checked)
            }}
          />
          Show edit controls
        </label>
      </div>

      {!selectedValueStream && showEditControls ? (
        <div className="maintainInlineForm">
          <p className="meta">Add new Value Stream</p>
          <input
            value={rootCreateDraft.name}
            onChange={(event) => setRootCreateDraft((previous) => ({ ...previous, name: event.target.value }))}
            placeholder="New Value Stream name"
          />
          <input
            value={rootCreateDraft.description}
            onChange={(event) => setRootCreateDraft((previous) => ({ ...previous, description: event.target.value }))}
            placeholder="Description"
          />
          <div className="actions">
            <button type="button" onClick={() => void handleAddRootInstance()} disabled={!rootCreateDraft.name.trim()}>
              Add Value Stream
            </button>
            <button type="button" onClick={() => void onNormalizeSiblingOrders()}>
              Order siblings
            </button>
          </div>
        </div>
      ) : null}

      {selectedValueStream ? (
        <div className="valueStreamTopPanels">
          <section className="valueStreamPanel">
            <h3>Value Stream concept</h3>
            <div className="treeCompactRow">
              <p>{selectedValueStream.name}</p>
              {showEditControls ? (
                <div className="actions">
                  <button type="button" onClick={() => openEditPanel(selectedValueStream)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onDeleteConcept(selectedValueStream.id)} disabled={Boolean(movingConceptId)}>
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
            {showEditControls && editPanelByConceptId[selectedValueStream.id] ? renderEditPanel(selectedValueStream) : null}
          </section>

          <section className="valueStreamPanel">
            <h3>Value Stream related items</h3>
            {valueStreamRelatedTopTypes.length === 0 ? (
              <p className="hint">No non-stage Value Stream child types configured.</p>
            ) : (
              <ul className="treeList valueStreamPanelList">
                {valueStreamRelatedTopTypes.map((childType) => {
                  const childTypeState = deriveChildTypeNodeState({
                    parentConceptId: selectedValueStream.id,
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

                  return (
                    <ConceptCompactChildTypeNode
                      key={`${selectedValueStream.id}-${childType.id}`}
                      data={{
                        childType,
                        createDraft: childTypeState.createDraft,
                        requiredReferenceTypeId: childTypeState.requiredReferenceTypeId,
                        requiredReferenceTypeName: childTypeState.requiredReferenceTypeName,
                        referenceOptions: childTypeState.referenceOptions,
                        referenceCreatePanelKey: childTypeState.referenceCreatePanelKey,
                        referenceCreateDraft: childTypeState.referenceCreateDraft,
                        referenceCreation: childTypeState.referenceCreation,
                        expectedParentTypeName: childTypeState.expectedParentTypeName,
                        childConceptNodes: childTypeState.childConcepts.map((childConcept) => (
                          <ConceptCompactBranch
                            key={childConcept.id}
                            concept={childConcept}
                            visited={new Set([selectedValueStream.id])}
                            currentDepth={1}
                          />
                        )),
                      }}
                      ui={{
                        showEditControls,
                        addPanelOpen: childTypeState.addPanelOpen,
                        referenceCreatePanelOpen: quickReferenceCreatePanelByKey[childTypeState.referenceCreatePanelKey] ?? false,
                      }}
                      actions={{
                        onToggleAddPanel: () => toggleAddPanel(selectedValueStream.id, childType.id),
                        onSetCreateDraft: (next) => setCreateDraft(selectedValueStream.id, childType.id, next),
                        onToggleQuickReferenceCreatePanel: toggleQuickReferenceCreatePanel,
                        onSetQuickReferenceCreateDraft: setQuickReferenceCreateDraft,
                        onCreateReferenceConcept: (referenceTypeId, panelKey) => {
                          void handleCreateReferenceConcept(referenceTypeId, panelKey)
                        },
                        onCloseQuickReferenceCreatePanel: closeQuickReferenceCreatePanel,
                        onAddChild: () => {
                          void handleAddChildInstance(selectedValueStream.id, childType.id)
                        },
                      }}
                    />
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p className="hint">Select a Value Stream to maintain stages and related concepts.</p>
      )}

      {selectedValueStream ? (
        <section className="valueStreamStagesSection">
          <div className="valueStreamStagesHeader">
            <h3>Value Stream stages</h3>
            <div className="actions">
              <button type="button" onClick={() => void onNormalizeSiblingOrders()}>
                Order siblings
              </button>
            </div>
          </div>

          {!valueStreamStageType ? (
            <p className="hint">No child ConceptType named &quot;Value Stream Stage&quot; is configured under Value Stream.</p>
          ) : null}

          {valueStreamStageType ? (
            <div className="valueStreamStagesScroller">
              <div className="valueStreamStagesStickyHeader" role="presentation">
                <p>{stageHeaderLabel}</p>
                <p>{stageDetailsHeaderLabel}</p>
              </div>

              {stageConcepts.length === 0 ? <p className="hint">No stages exist for this Value Stream.</p> : null}

              {stageConcepts.map((stageConcept) => {
                const siblingConcepts = selectedValueStream ? childrenByParentConceptId.get(selectedValueStream.id) ?? [] : []
                const siblingIndex = siblingConcepts.findIndex((sibling) => sibling.id === stageConcept.id)
                const canMoveUp = siblingIndex > 0
                const canMoveDown = siblingIndex >= 0 && siblingIndex < siblingConcepts.length - 1

                return (
                  <article key={stageConcept.id} className="valueStreamStageRow">
                    <div className="treeCompactRow valueStreamStageRowHeader">
                      <p>{stageConcept.name}</p>
                      {showEditControls ? (
                        <div className="actions">
                          <button
                            type="button"
                            onClick={() => {
                              void onMoveConceptWithinParent(stageConcept.id, 'up')
                            }}
                            disabled={!canMoveUp || Boolean(movingConceptId)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void onMoveConceptWithinParent(stageConcept.id, 'down')
                            }}
                            disabled={!canMoveDown || Boolean(movingConceptId)}
                          >
                            ↓
                          </button>
                          <button type="button" onClick={() => openEditPanel(stageConcept)}>
                            Edit
                          </button>
                          <button type="button" onClick={() => onDeleteConcept(stageConcept.id)} disabled={Boolean(movingConceptId)}>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {showEditControls && editPanelByConceptId[stageConcept.id] ? renderEditPanel(stageConcept) : null}

                    <ul className="treeList valueStreamStageDetailList valueStreamStageDetailGrid">
                      {stageDetailTypes.map((detailType) => {
                        const detailTypeState = deriveChildTypeNodeState({
                          parentConceptId: stageConcept.id,
                          childType: detailType,
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

                        return (
                          <ConceptCompactChildTypeNode
                            key={`${stageConcept.id}-${detailType.id}`}
                            data={{
                              childType: detailType,
                              createDraft: detailTypeState.createDraft,
                              requiredReferenceTypeId: detailTypeState.requiredReferenceTypeId,
                              requiredReferenceTypeName: detailTypeState.requiredReferenceTypeName,
                              referenceOptions: detailTypeState.referenceOptions,
                              referenceCreatePanelKey: detailTypeState.referenceCreatePanelKey,
                              referenceCreateDraft: detailTypeState.referenceCreateDraft,
                              referenceCreation: detailTypeState.referenceCreation,
                              expectedParentTypeName: detailTypeState.expectedParentTypeName,
                              childConceptNodes: detailTypeState.childConcepts.map((detailConcept) => (
                                <ConceptCompactBranch
                                  key={detailConcept.id}
                                  concept={detailConcept}
                                  visited={new Set([selectedValueStream.id, stageConcept.id])}
                                  currentDepth={2}
                                />
                              )),
                            }}
                            ui={{
                              showEditControls,
                              addPanelOpen: detailTypeState.addPanelOpen,
                              referenceCreatePanelOpen: quickReferenceCreatePanelByKey[detailTypeState.referenceCreatePanelKey] ?? false,
                            }}
                            actions={{
                              onToggleAddPanel: () => toggleAddPanel(stageConcept.id, detailType.id),
                              onSetCreateDraft: (next) => setCreateDraft(stageConcept.id, detailType.id, next),
                              onToggleQuickReferenceCreatePanel: toggleQuickReferenceCreatePanel,
                              onSetQuickReferenceCreateDraft: setQuickReferenceCreateDraft,
                              onCreateReferenceConcept: (referenceTypeId, panelKey) => {
                                void handleCreateReferenceConcept(referenceTypeId, panelKey)
                              },
                              onCloseQuickReferenceCreatePanel: closeQuickReferenceCreatePanel,
                              onAddChild: () => {
                                void handleAddChildInstance(stageConcept.id, detailType.id)
                              },
                            }}
                          />
                        )
                      })}
                    </ul>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </ConceptCompactBranchProvider>
  )
}