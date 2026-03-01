import { useEffect, useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import type { ConceptPayload, ConceptRecord } from '../types'
import { orderSiblings } from '../../shared/utils/siblingOrdering'

type ConceptCompactViewProps = {
  concepts: ConceptRecord[]
  conceptTypes: ConceptTypeRecord[]
  conceptTypeById: Map<string, ConceptTypeRecord>
  conceptById: Map<string, ConceptRecord>
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
  onUpdateConcept: (id: string, payload: ConceptPayload) => Promise<boolean>
}

export function ConceptCompactView({
  concepts,
  conceptTypes,
  conceptTypeById,
  conceptById,
  onCreateConcept,
  onUpdateConcept,
}: ConceptCompactViewProps) {
  const [selectedRootTypeId, setSelectedRootTypeId] = useState('')
  const [selectedRootConceptId, setSelectedRootConceptId] = useState('')
  const [showEditControls, setShowEditControls] = useState(false)
  const [rootCreateDraft, setRootCreateDraft] = useState<{ name: string; description: string }>({
    name: '',
    description: '',
  })
  const [addPanelByParentTypeKey, setAddPanelByParentTypeKey] = useState<Record<string, boolean>>({})
  const [createDraftByParentTypeKey, setCreateDraftByParentTypeKey] = useState<
    Record<string, { name: string; description: string; referenceToConceptId: string }>
  >({})
  const [editPanelByConceptId, setEditPanelByConceptId] = useState<Record<string, boolean>>({})
  const [editDraftByConceptId, setEditDraftByConceptId] = useState<
    Record<string, { name: string; description: string; referenceToConceptId: string }>
  >({})
  const [quickReferenceCreatePanelByKey, setQuickReferenceCreatePanelByKey] = useState<Record<string, boolean>>({})
  const [quickReferenceCreateDraftByKey, setQuickReferenceCreateDraftByKey] = useState<
    Record<string, { name: string; description: string; parentConceptId: string }>
  >({})
  const [pendingRootSelection, setPendingRootSelection] = useState<{ conceptTypeId: string; name: string } | null>(null)
  const [pendingReferenceSelectionByKey, setPendingReferenceSelectionByKey] = useState<
    Record<string, { referenceConceptTypeId: string; name: string }>
  >({})

  const rootOrDecomposableTypes = useMemo(
    () =>
      orderSiblings(
        conceptTypes.filter(
          (conceptType) => !conceptType.part_of_concept_type_id || conceptType.part_of_concept_type_id === conceptType.id,
        ),
      ),
    [conceptTypes],
  )

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
    () =>
      concepts
        .filter((concept) => concept.concept_type_id === selectedRootTypeId)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [concepts, selectedRootTypeId],
  )

  const selectedRootType = selectedRootTypeId ? conceptTypeById.get(selectedRootTypeId) ?? null : null
  const selectedRootConcept = selectedRootConceptId ? conceptById.get(selectedRootConceptId) ?? null : null

  const handleAddRootInstance = async () => {
    if (!selectedRootTypeId) {
      return
    }

    const nextName = rootCreateDraft.name.trim()
    if (!nextName) {
      return
    }

    const success = await onCreateConcept({
      name: nextName,
      description: rootCreateDraft.description.trim() ? rootCreateDraft.description.trim() : null,
      concept_type_id: selectedRootTypeId,
      part_of_concept_id: null,
      part_order: null,
      reference_to_concept_id: null,
    })

    if (success) {
      setPendingRootSelection({ conceptTypeId: selectedRootTypeId, name: nextName })
      setRootCreateDraft({ name: '', description: '' })
    }
  }

  useEffect(() => {
    if (!pendingRootSelection) {
      return
    }

    const matched = concepts.find(
      (concept) =>
        concept.concept_type_id === pendingRootSelection.conceptTypeId &&
        !concept.part_of_concept_id &&
        concept.name.trim().toLowerCase() === pendingRootSelection.name.trim().toLowerCase(),
    )

    if (matched) {
      setSelectedRootTypeId(pendingRootSelection.conceptTypeId)
      setSelectedRootConceptId(matched.id)
      setPendingRootSelection(null)
    }
  }, [concepts, pendingRootSelection])

  const getDraftKey = (parentConceptId: string, childConceptTypeId: string) => `${parentConceptId}::${childConceptTypeId}`

  const setCreateDraft = (
    parentConceptId: string,
    childConceptTypeId: string,
    next: Partial<{ name: string; description: string; referenceToConceptId: string }>,
  ) => {
    const key = getDraftKey(parentConceptId, childConceptTypeId)
    setCreateDraftByParentTypeKey((previous) => ({
      ...previous,
      [key]: {
        ...(previous[key] ?? { name: '', description: '', referenceToConceptId: '' }),
        ...next,
      },
    }))
  }

  const clearCreateDraft = (parentConceptId: string, childConceptTypeId: string) => {
    const key = getDraftKey(parentConceptId, childConceptTypeId)
    setCreateDraftByParentTypeKey((previous) => {
      if (!previous[key]) {
        return previous
      }

      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  const toggleAddPanel = (parentConceptId: string, childConceptTypeId: string) => {
    if (!showEditControls) {
      return
    }

    const key = getDraftKey(parentConceptId, childConceptTypeId)
    setAddPanelByParentTypeKey((previous) => ({
      ...previous,
      [key]: !previous[key],
    }))
  }

  const openEditPanel = (concept: ConceptRecord) => {
    if (!showEditControls) {
      return
    }

    setEditPanelByConceptId((previous) => ({
      ...previous,
      [concept.id]: true,
    }))
    setEditDraftByConceptId((previous) => ({
      ...previous,
      [concept.id]: {
        name: concept.name,
        description: concept.description ?? '',
        referenceToConceptId: concept.reference_to_concept_id ?? '',
      },
    }))
  }

  const closeEditPanel = (conceptId: string) => {
    setEditPanelByConceptId((previous) => ({
      ...previous,
      [conceptId]: false,
    }))
  }

  const setEditDraft = (
    conceptId: string,
    next: Partial<{ name: string; description: string; referenceToConceptId: string }>,
  ) => {
    setEditDraftByConceptId((previous) => ({
      ...previous,
      [conceptId]: {
        ...(previous[conceptId] ?? { name: '', description: '', referenceToConceptId: '' }),
        ...next,
      },
    }))
  }

  const getReferenceCreateKeyForEdit = (conceptId: string) => `edit-ref::${conceptId}`

  const getReferenceCreateKeyForAdd = (parentConceptId: string, childConceptTypeId: string) =>
    `add-ref::${parentConceptId}::${childConceptTypeId}`

  const getPendingSelectionKeyForEdit = (conceptId: string) => `edit::${conceptId}`

  const getPendingSelectionKeyForAdd = (parentConceptId: string, childConceptTypeId: string) =>
    `add::${parentConceptId}::${childConceptTypeId}`

  const setQuickReferenceCreateDraft = (
    panelKey: string,
    next: Partial<{ name: string; description: string; parentConceptId: string }>,
  ) => {
    setQuickReferenceCreateDraftByKey((previous) => ({
      ...previous,
      [panelKey]: {
        ...(previous[panelKey] ?? { name: '', description: '', parentConceptId: '' }),
        ...next,
      },
    }))
  }

  const toggleQuickReferenceCreatePanel = (panelKey: string) => {
    setQuickReferenceCreatePanelByKey((previous) => ({
      ...previous,
      [panelKey]: !previous[panelKey],
    }))
  }

  const clearQuickReferenceCreateDraft = (panelKey: string) => {
    setQuickReferenceCreateDraftByKey((previous) => {
      if (!previous[panelKey]) {
        return previous
      }

      const next = { ...previous }
      delete next[panelKey]
      return next
    })
  }

  const closeQuickReferenceCreatePanel = (panelKey: string) => {
    setQuickReferenceCreatePanelByKey((previous) => ({
      ...previous,
      [panelKey]: false,
    }))
  }

  const getReferenceCreationParentOptions = (referenceConceptTypeId: string) => {
    const referenceType = conceptTypeById.get(referenceConceptTypeId)
    const expectedParentTypeId = referenceType?.part_of_concept_type_id ?? null
    const requiresParentSelection = Boolean(expectedParentTypeId && expectedParentTypeId !== referenceConceptTypeId)

    const parentOptions = expectedParentTypeId
      ? concepts
          .filter((concept) => concept.concept_type_id === expectedParentTypeId)
          .sort((left, right) => left.name.localeCompare(right.name))
      : []

    return {
      expectedParentTypeId,
      requiresParentSelection,
      parentOptions,
    }
  }

  const handleCreateReferenceConcept = async (referenceConceptTypeId: string, panelKey: string) => {
    const draft = quickReferenceCreateDraftByKey[panelKey] ?? { name: '', description: '', parentConceptId: '' }
    const nextName = draft.name.trim()
    if (!nextName) {
      return
    }

    const { requiresParentSelection, parentOptions } = getReferenceCreationParentOptions(referenceConceptTypeId)
    const resolvedParentConceptId =
      draft.parentConceptId || (requiresParentSelection && parentOptions.length === 1 ? parentOptions[0].id : '')

    if (requiresParentSelection && !resolvedParentConceptId) {
      return
    }

    const success = await onCreateConcept({
      name: nextName,
      description: draft.description.trim() ? draft.description.trim() : null,
      concept_type_id: referenceConceptTypeId,
      part_of_concept_id: resolvedParentConceptId || null,
      part_order: null,
      reference_to_concept_id: null,
    })

    if (success) {
      const pendingSelectionKey = panelKey.startsWith('edit-ref::')
        ? getPendingSelectionKeyForEdit(panelKey.replace('edit-ref::', ''))
        : panelKey.startsWith('add-ref::')
          ? getPendingSelectionKeyForAdd(...(panelKey.replace('add-ref::', '').split('::') as [string, string]))
          : null

      if (pendingSelectionKey) {
        setPendingReferenceSelectionByKey((previous) => ({
          ...previous,
          [pendingSelectionKey]: {
            referenceConceptTypeId,
            name: nextName,
          },
        }))
      }

      clearQuickReferenceCreateDraft(panelKey)
      closeQuickReferenceCreatePanel(panelKey)
    }
  }

  useEffect(() => {
    const pendingEntries = Object.entries(pendingReferenceSelectionByKey)
    if (pendingEntries.length === 0) {
      return
    }

    let didResolveAny = false

    const resolvedKeys = new Set<string>()

    for (const [pendingKey, pending] of pendingEntries) {
      const matchedReference = concepts.find(
        (concept) =>
          concept.concept_type_id === pending.referenceConceptTypeId &&
          concept.name.trim().toLowerCase() === pending.name.trim().toLowerCase(),
      )

      if (!matchedReference) {
        continue
      }

      if (pendingKey.startsWith('add::')) {
        const scopedKey = pendingKey.replace('add::', '')
        setCreateDraftByParentTypeKey((previous) => ({
          ...previous,
          [scopedKey]: {
            ...(previous[scopedKey] ?? { name: '', description: '', referenceToConceptId: '' }),
            referenceToConceptId: matchedReference.id,
          },
        }))
      } else if (pendingKey.startsWith('edit::')) {
        const conceptId = pendingKey.replace('edit::', '')
        setEditDraftByConceptId((previous) => ({
          ...previous,
          [conceptId]: {
            ...(previous[conceptId] ?? { name: '', description: '', referenceToConceptId: '' }),
            referenceToConceptId: matchedReference.id,
          },
        }))
      }

      didResolveAny = true
      resolvedKeys.add(pendingKey)
    }

    if (!didResolveAny) {
      return
    }

    setPendingReferenceSelectionByKey((previous) => {
      const next = { ...previous }
      for (const key of resolvedKeys) {
        delete next[key]
      }
      return next
    })
  }, [concepts, pendingReferenceSelectionByKey])

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

  const renderConceptBranch = (concept: ConceptRecord, visited: Set<string>): JSX.Element => {
    const conceptType = conceptTypeById.get(concept.concept_type_id)
    const referenceTarget = concept.reference_to_concept_id
      ? conceptById.get(concept.reference_to_concept_id) ?? null
      : null

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

    return (
      <li key={concept.id} className="treeNode">
        {(() => {
          const conceptTypeForEdit = conceptTypeById.get(concept.concept_type_id)
          const requiredReferenceTypeId = conceptTypeForEdit?.reference_to_concept_type_id ?? null
          const referenceOptions = requiredReferenceTypeId
            ? concepts
                .filter((candidate) => candidate.concept_type_id === requiredReferenceTypeId)
                .sort((left, right) => left.name.localeCompare(right.name))
            : []
          const referenceCreatePanelKey = getReferenceCreateKeyForEdit(concept.id)
          const referenceCreateDraft = quickReferenceCreateDraftByKey[referenceCreatePanelKey] ?? {
            name: '',
            description: '',
            parentConceptId: '',
          }
          const referenceCreation = requiredReferenceTypeId
            ? getReferenceCreationParentOptions(requiredReferenceTypeId)
            : { expectedParentTypeId: null, requiresParentSelection: false, parentOptions: [] }

          return (
            <>
        <div className="treeCompactRow">
          <p>{concept.name}</p>
          {showEditControls ? (
            <div className="actions">
              <button type="button" onClick={() => openEditPanel(concept)}>
                Edit
              </button>
            </div>
          ) : null}
        </div>
        {showEditControls && editPanelByConceptId[concept.id] ? (
          <div className="maintainInlineForm">
            <input
              value={(editDraftByConceptId[concept.id]?.name ?? concept.name)}
              onChange={(event) => setEditDraft(concept.id, { name: event.target.value })}
              placeholder="Concept name"
            />
            <input
              value={(editDraftByConceptId[concept.id]?.description ?? concept.description ?? '')}
              onChange={(event) => setEditDraft(concept.id, { description: event.target.value })}
              placeholder="Description"
            />
            {requiredReferenceTypeId ? (
              <label>
                Reference To
                <select
                  value={editDraftByConceptId[concept.id]?.referenceToConceptId ?? concept.reference_to_concept_id ?? ''}
                  onChange={(event) => setEditDraft(concept.id, { referenceToConceptId: event.target.value })}
                >
                  <option value="">(none)</option>
                  {referenceOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} ({option.id})
                    </option>
                  ))}
                </select>
                <span className="hint">
                  Must reference a concept of type{' '}
                  {conceptTypeById.get(requiredReferenceTypeId)?.name ?? requiredReferenceTypeId}.
                </span>
              </label>
            ) : null}
            {requiredReferenceTypeId && referenceOptions.length === 0 ? (
              <p className="hint">
                No valid reference concepts yet. Add an instance of{' '}
                {conceptTypeById.get(requiredReferenceTypeId)?.name ?? requiredReferenceTypeId} first.
              </p>
            ) : null}
            {requiredReferenceTypeId ? (
              <div className="actions">
                <button type="button" onClick={() => toggleQuickReferenceCreatePanel(referenceCreatePanelKey)}>
                  {quickReferenceCreatePanelByKey[referenceCreatePanelKey]
                    ? `Close new ${conceptTypeById.get(requiredReferenceTypeId)?.name ?? 'reference'} panel`
                    : `Add new ${conceptTypeById.get(requiredReferenceTypeId)?.name ?? 'reference'}`}
                </button>
              </div>
            ) : null}
            {requiredReferenceTypeId && quickReferenceCreatePanelByKey[referenceCreatePanelKey] ? (
              <div className="maintainInlineForm">
                <input
                  value={referenceCreateDraft.name}
                  onChange={(event) =>
                    setQuickReferenceCreateDraft(referenceCreatePanelKey, { name: event.target.value })
                  }
                  placeholder={`New ${conceptTypeById.get(requiredReferenceTypeId)?.name ?? 'reference'} name`}
                />
                <input
                  value={referenceCreateDraft.description}
                  onChange={(event) =>
                    setQuickReferenceCreateDraft(referenceCreatePanelKey, { description: event.target.value })
                  }
                  placeholder="Description"
                />
                {referenceCreation.requiresParentSelection ? (
                  <label>
                    Parent Concept
                    <select
                      value={referenceCreateDraft.parentConceptId}
                      onChange={(event) =>
                        setQuickReferenceCreateDraft(referenceCreatePanelKey, { parentConceptId: event.target.value })
                      }
                    >
                      <option value="">(select)</option>
                      {referenceCreation.parentOptions.map((parentConcept) => (
                        <option key={parentConcept.id} value={parentConcept.id}>
                          {parentConcept.name} ({parentConcept.id})
                        </option>
                      ))}
                    </select>
                    <span className="hint">
                      Required parent type:{' '}
                      {referenceCreation.expectedParentTypeId
                        ? conceptTypeById.get(referenceCreation.expectedParentTypeId)?.name ??
                          referenceCreation.expectedParentTypeId
                        : '(none)'}
                    </span>
                  </label>
                ) : null}
                {referenceCreation.requiresParentSelection && referenceCreation.parentOptions.length === 0 ? (
                  <p className="hint">
                    No valid parent concepts exist yet. Create one first to add this reference concept.
                  </p>
                ) : null}
                <div className="actions">
                  <button
                    type="button"
                    onClick={() => {
                      void handleCreateReferenceConcept(requiredReferenceTypeId, referenceCreatePanelKey)
                    }}
                    disabled={
                      !referenceCreateDraft.name.trim() ||
                      (referenceCreation.requiresParentSelection &&
                        referenceCreation.parentOptions.length > 0 &&
                        !referenceCreateDraft.parentConceptId)
                    }
                  >
                    Add reference instance
                  </button>
                  <button type="button" onClick={() => closeQuickReferenceCreatePanel(referenceCreatePanelKey)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            <div className="actions">
              <button type="button" onClick={() => void handleSaveConceptEdit(concept)}>
                Save
              </button>
              <button type="button" onClick={() => closeEditPanel(concept.id)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {referenceTarget ? (
          <p className="meta">
            Refers to: {referenceTarget.name}
            {` (${conceptTypeById.get(referenceTarget.concept_type_id)?.name ?? referenceTarget.concept_type_id})`}
          </p>
        ) : null}

            </>
          )
        })()}

        {childTypes.length > 0 ? (
          <ul className="treeList">
            {childTypes.map((childType) => {
              const requiredReferenceTypeId = childType.reference_to_concept_type_id
              const referenceOptions = requiredReferenceTypeId
                ? concepts
                    .filter((candidate) => candidate.concept_type_id === requiredReferenceTypeId)
                    .sort((left, right) => left.name.localeCompare(right.name))
                : []
              const childConcepts = (childrenByParentConceptId.get(concept.id) ?? []).filter(
                (childConcept) => childConcept.concept_type_id === childType.id,
              )
              const key = getDraftKey(concept.id, childType.id)
              const createDraft = createDraftByParentTypeKey[key] ?? {
                name: '',
                description: '',
                referenceToConceptId: '',
              }
              const addPanelOpen = addPanelByParentTypeKey[key] ?? false
              const referenceCreatePanelKey = getReferenceCreateKeyForAdd(concept.id, childType.id)
              const referenceCreateDraft = quickReferenceCreateDraftByKey[referenceCreatePanelKey] ?? {
                name: '',
                description: '',
                parentConceptId: '',
              }
              const referenceCreation = requiredReferenceTypeId
                ? getReferenceCreationParentOptions(requiredReferenceTypeId)
                : { expectedParentTypeId: null, requiresParentSelection: false, parentOptions: [] }

              return (
                <li key={`${concept.id}-${childType.id}`} className="treeNode">
                  <div className="treeCompactRow treeTypeRow">
                    <p>{childType.name}</p>
                    {showEditControls ? (
                      <div className="actions">
                        <button type="button" onClick={() => toggleAddPanel(concept.id, childType.id)}>
                          {addPanelOpen ? 'Close' : 'Add'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {showEditControls && addPanelOpen ? (
                    <div className="maintainInlineForm">
                      <input
                        value={createDraft.name}
                        onChange={(event) => setCreateDraft(concept.id, childType.id, { name: event.target.value })}
                        placeholder={`New ${childType.name}`}
                      />
                      <input
                        value={createDraft.description}
                        onChange={(event) =>
                          setCreateDraft(concept.id, childType.id, { description: event.target.value })
                        }
                        placeholder="Description"
                      />
                      {requiredReferenceTypeId ? (
                        <label>
                          Reference To
                          <select
                            value={createDraft.referenceToConceptId}
                            onChange={(event) =>
                              setCreateDraft(concept.id, childType.id, { referenceToConceptId: event.target.value })
                            }
                          >
                            <option value="">(none)</option>
                            {referenceOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name} ({option.id})
                              </option>
                            ))}
                          </select>
                          <span className="hint">
                            Must reference a concept of type{' '}
                            {conceptTypeById.get(requiredReferenceTypeId)?.name ?? requiredReferenceTypeId}.
                          </span>
                        </label>
                      ) : null}
                      {requiredReferenceTypeId && referenceOptions.length === 0 ? (
                        <p className="hint">
                          No valid reference concepts yet. Add an instance of{' '}
                          {conceptTypeById.get(requiredReferenceTypeId)?.name ?? requiredReferenceTypeId} first.
                        </p>
                      ) : null}
                      {requiredReferenceTypeId ? (
                        <div className="actions">
                          <button type="button" onClick={() => toggleQuickReferenceCreatePanel(referenceCreatePanelKey)}>
                            {quickReferenceCreatePanelByKey[referenceCreatePanelKey]
                              ? `Close new ${conceptTypeById.get(requiredReferenceTypeId)?.name ?? 'reference'} panel`
                              : `Add new ${conceptTypeById.get(requiredReferenceTypeId)?.name ?? 'reference'}`}
                          </button>
                        </div>
                      ) : null}
                      {requiredReferenceTypeId && quickReferenceCreatePanelByKey[referenceCreatePanelKey] ? (
                        <div className="maintainInlineForm">
                          <input
                            value={referenceCreateDraft.name}
                            onChange={(event) =>
                              setQuickReferenceCreateDraft(referenceCreatePanelKey, { name: event.target.value })
                            }
                            placeholder={`New ${conceptTypeById.get(requiredReferenceTypeId)?.name ?? 'reference'} name`}
                          />
                          <input
                            value={referenceCreateDraft.description}
                            onChange={(event) =>
                              setQuickReferenceCreateDraft(referenceCreatePanelKey, { description: event.target.value })
                            }
                            placeholder="Description"
                          />
                          {referenceCreation.requiresParentSelection ? (
                            <label>
                              Parent Concept
                              <select
                                value={referenceCreateDraft.parentConceptId}
                                onChange={(event) =>
                                  setQuickReferenceCreateDraft(referenceCreatePanelKey, { parentConceptId: event.target.value })
                                }
                              >
                                <option value="">(select)</option>
                                {referenceCreation.parentOptions.map((parentConcept) => (
                                  <option key={parentConcept.id} value={parentConcept.id}>
                                    {parentConcept.name} ({parentConcept.id})
                                  </option>
                                ))}
                              </select>
                              <span className="hint">
                                Required parent type:{' '}
                                {referenceCreation.expectedParentTypeId
                                  ? conceptTypeById.get(referenceCreation.expectedParentTypeId)?.name ??
                                    referenceCreation.expectedParentTypeId
                                  : '(none)'}
                              </span>
                            </label>
                          ) : null}
                          {referenceCreation.requiresParentSelection && referenceCreation.parentOptions.length === 0 ? (
                            <p className="hint">
                              No valid parent concepts exist yet. Create one first to add this reference concept.
                            </p>
                          ) : null}
                          <div className="actions">
                            <button
                              type="button"
                              onClick={() => {
                                void handleCreateReferenceConcept(requiredReferenceTypeId, referenceCreatePanelKey)
                              }}
                              disabled={
                                !referenceCreateDraft.name.trim() ||
                                (referenceCreation.requiresParentSelection &&
                                  referenceCreation.parentOptions.length > 0 &&
                                  !referenceCreateDraft.parentConceptId)
                              }
                            >
                              Add reference instance
                            </button>
                            <button type="button" onClick={() => closeQuickReferenceCreatePanel(referenceCreatePanelKey)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <div className="actions">
                        <button
                          type="button"
                          onClick={() => {
                            void handleAddChildInstance(concept.id, childType.id)
                          }}
                          disabled={!createDraft.name.trim()}
                        >
                          Add
                        </button>
                        <button type="button" onClick={() => toggleAddPanel(concept.id, childType.id)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {childConcepts.length > 0 ? (
                    <ul className="treeList">{childConcepts.map((childConcept) => renderConceptBranch(childConcept, nextVisited))}</ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </li>
    )
  }

  return (
    <div className="maintainInlineForm">
      <p className="meta">Compact PartOf view</p>
      <div className="viewControls">
        <label>
          Root/Decomposable ConceptType
          <select
            value={selectedRootTypeId}
            onChange={(event) => {
              setSelectedRootTypeId(event.target.value)
              setSelectedRootConceptId('')
            }}
          >
            <option value="">(select)</option>
            {rootOrDecomposableTypes.map((conceptType) => (
              <option key={conceptType.id} value={conceptType.id}>
                {conceptType.name} ({conceptType.id})
              </option>
            ))}
          </select>
        </label>

        <label>
          Concept instance
          <select value={selectedRootConceptId} onChange={(event) => setSelectedRootConceptId(event.target.value)}>
            <option value="">(select)</option>
            {rootConceptOptions.map((concept) => (
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
              const nextValue = event.target.checked
              setShowEditControls(nextValue)
              if (!nextValue) {
                setAddPanelByParentTypeKey({})
                setEditPanelByConceptId({})
                setQuickReferenceCreatePanelByKey({})
                setQuickReferenceCreateDraftByKey({})
              }
            }}
          />
          Show edit controls
        </label>
      </div>

      {!selectedRootType ? <p className="hint">Select a root or decomposable ConceptType to begin.</p> : null}
      {selectedRootType && rootConceptOptions.length === 0 ? (
        <p className="hint">No concept instances exist for the selected ConceptType.</p>
      ) : null}

      {showEditControls && selectedRootType && !selectedRootConceptId ? (
        <div className="maintainInlineForm">
          <p className="meta">Add new {selectedRootType.name} instance</p>
          <input
            value={rootCreateDraft.name}
            onChange={(event) => setRootCreateDraft((previous) => ({ ...previous, name: event.target.value }))}
            placeholder={`New ${selectedRootType.name} name`}
          />
          <input
            value={rootCreateDraft.description}
            onChange={(event) =>
              setRootCreateDraft((previous) => ({ ...previous, description: event.target.value }))
            }
            placeholder="Description"
          />
          <div className="actions">
            <button type="button" onClick={() => void handleAddRootInstance()} disabled={!rootCreateDraft.name.trim()}>
              Add root instance
            </button>
          </div>
        </div>
      ) : null}

      {selectedRootType && selectedRootConcept ? (
        <ul className="treeList">
          <li className="treeNode">
            <div className="treeCompactRow treeTypeRow">
              <p>{selectedRootType.name}</p>
            </div>
            <ul className="treeList">{renderConceptBranch(selectedRootConcept, new Set())}</ul>
          </li>
        </ul>
      ) : null}
    </div>
  )
}