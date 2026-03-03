import { useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../csv/types'
import type { ConceptTypePayload } from '../data/conceptTypeService'

export type ConceptTypeCompactViewProps = {
  conceptTypes: ConceptTypeRecord[]
  selectedRoot: ConceptTypeRecord | null
  childrenByParentId: Map<string, ConceptTypeRecord[]>
  movingConceptTypeId: string | null
  onCreateConceptTypeFromPayload: (payload: ConceptTypePayload, successMessage?: string) => Promise<boolean>
  onUpdateConceptTypeFromPayload: (id: string, payload: ConceptTypePayload, successMessage?: string) => Promise<boolean>
  onDelete: (id: string) => void
  onMoveConceptType: (id: string, direction: 'up' | 'down') => void
}

type CompactDraft = {
  name: string
  description: string
  partOrder: string
  referenceToConceptTypeId: string
}

const EMPTY_DRAFT: CompactDraft = {
  name: '',
  description: '',
  partOrder: '',
  referenceToConceptTypeId: '',
}

export function ConceptTypeCompactView({
  conceptTypes,
  selectedRoot,
  childrenByParentId,
  movingConceptTypeId,
  onCreateConceptTypeFromPayload,
  onUpdateConceptTypeFromPayload,
  onDelete,
  onMoveConceptType,
}: ConceptTypeCompactViewProps) {
  const [showEditControls, setShowEditControls] = useState(true)
  const [maxTreeDepth, setMaxTreeDepth] = useState<number | null>(null)
  const [rootDraft, setRootDraft] = useState<CompactDraft>(EMPTY_DRAFT)
  const [addPanelByParentId, setAddPanelByParentId] = useState<Record<string, boolean>>({})
  const [addDraftByParentId, setAddDraftByParentId] = useState<Record<string, CompactDraft>>({})
  const [editPanelById, setEditPanelById] = useState<Record<string, boolean>>({})
  const [editDraftById, setEditDraftById] = useState<Record<string, CompactDraft>>({})

  const referenceOptions = useMemo(
    () => [...conceptTypes].sort((left, right) => left.name.localeCompare(right.name)),
    [conceptTypes],
  )
  const depthSelectValue = maxTreeDepth === null ? 'all' : String(maxTreeDepth)

  const getReferenceOptionsForEdit = (conceptTypeId: string) =>
    referenceOptions.filter((option) => option.id !== conceptTypeId)

  const createPayloadFromDraft = (draft: CompactDraft, parentId: string | null): ConceptTypePayload => {
    const normalizedName = draft.name.trim()
    const normalizedDescription = draft.description.trim() ? draft.description.trim() : null
    const normalizedPartOrder = parentId
      ? Number.isInteger(Number.parseInt(draft.partOrder, 10))
        ? Number.parseInt(draft.partOrder, 10)
        : 1
      : null

    return {
      name: normalizedName,
      description: normalizedDescription,
      part_of_concept_type_id: parentId,
      part_order: normalizedPartOrder,
      reference_to_concept_type_id: parentId ? draft.referenceToConceptTypeId || null : null,
    }
  }

  const openEditPanel = (conceptType: ConceptTypeRecord) => {
    setEditPanelById((previous) => ({ ...previous, [conceptType.id]: true }))
    setEditDraftById((previous) => ({
      ...previous,
      [conceptType.id]: {
        name: conceptType.name,
        description: conceptType.description ?? '',
        partOrder: conceptType.part_order ? String(conceptType.part_order) : '',
        referenceToConceptTypeId: conceptType.reference_to_concept_type_id ?? '',
      },
    }))
  }

  const closeEditPanel = (conceptTypeId: string) => {
    setEditPanelById((previous) => ({ ...previous, [conceptTypeId]: false }))
  }

  const toggleAddPanel = (parentId: string) => {
    setAddPanelByParentId((previous) => ({ ...previous, [parentId]: !previous[parentId] }))
    setAddDraftByParentId((previous) => ({
      ...previous,
      [parentId]: previous[parentId] ?? EMPTY_DRAFT,
    }))
  }

  const handleCreateRoot = async () => {
    const payload = createPayloadFromDraft(rootDraft, null)
    const success = await onCreateConceptTypeFromPayload(payload, 'MetaModel type created via compact maintenance.')
    if (success) {
      setRootDraft(EMPTY_DRAFT)
    }
  }

  const handleCreateChild = async (parentId: string) => {
    const draft = addDraftByParentId[parentId] ?? EMPTY_DRAFT
    const payload = createPayloadFromDraft(draft, parentId)
    const success = await onCreateConceptTypeFromPayload(payload, 'MetaModel type created via compact maintenance.')
    if (success) {
      setAddDraftByParentId((previous) => ({ ...previous, [parentId]: EMPTY_DRAFT }))
      setAddPanelByParentId((previous) => ({ ...previous, [parentId]: false }))
    }
  }

  const handleSaveEdit = async (conceptType: ConceptTypeRecord) => {
    const draft = editDraftById[conceptType.id]
    if (!draft) {
      return
    }

    const payload = createPayloadFromDraft(draft, conceptType.part_of_concept_type_id)
    const success = await onUpdateConceptTypeFromPayload(
      conceptType.id,
      payload,
      'MetaModel type updated via compact maintenance.',
    )

    if (success) {
      closeEditPanel(conceptType.id)
    }
  }

  const renderNode = (
    conceptType: ConceptTypeRecord,
    parentId: string | null,
    visited: Set<string>,
    currentDepth: number,
  ): JSX.Element => {
    if (visited.has(conceptType.id)) {
      return (
        <li key={`cycle-${conceptType.id}`} className="treeNode">
          <p>{conceptType.name}</p>
          <p className="hint">Cycle detected in PartOf path; expansion stopped.</p>
        </li>
      )
    }

    const nextVisited = new Set(visited)
    nextVisited.add(conceptType.id)

    const children = (childrenByParentId.get(conceptType.id) ?? []).filter((child) => child.id !== conceptType.id)
    const canRenderChildrenByDepth = maxTreeDepth === null || currentDepth < maxTreeDepth
    const siblings = parentId ? childrenByParentId.get(parentId) ?? [] : []
    const siblingIndex = siblings.findIndex((sibling) => sibling.id === conceptType.id)
    const canMoveUp = parentId !== null && siblingIndex > 0
    const canMoveDown = parentId !== null && siblingIndex >= 0 && siblingIndex < siblings.length - 1
    const isMoveInProgress = Boolean(movingConceptTypeId)

    const addDraft = addDraftByParentId[conceptType.id] ?? EMPTY_DRAFT
    const editDraft = editDraftById[conceptType.id] ?? EMPTY_DRAFT
    const editReferenceOptions = getReferenceOptionsForEdit(conceptType.id)

    return (
      <li key={conceptType.id} className="treeNode">
        <div className="treeCompactRow">
          <p>{conceptType.name}</p>
          {showEditControls ? (
            <div className="actions">
              {parentId ? (
                <>
                  <button
                    type="button"
                    onClick={() => onMoveConceptType(conceptType.id, 'up')}
                    disabled={!canMoveUp || isMoveInProgress}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveConceptType(conceptType.id, 'down')}
                    disabled={!canMoveDown || isMoveInProgress}
                  >
                    ↓
                  </button>
                </>
              ) : null}
              <button type="button" onClick={() => toggleAddPanel(conceptType.id)}>
                Add child
              </button>
              <button type="button" onClick={() => openEditPanel(conceptType)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(conceptType.id)} disabled={isMoveInProgress}>
                Delete
              </button>
            </div>
          ) : null}
        </div>

        {showEditControls && addPanelByParentId[conceptType.id] ? (
          <div className="maintainInlineForm">
            <p className="meta">Add child MetaModel type</p>
            <input
              value={addDraft.name}
              onChange={(event) =>
                setAddDraftByParentId((previous) => ({
                  ...previous,
                  [conceptType.id]: { ...addDraft, name: event.target.value },
                }))
              }
              placeholder="Name"
            />
            <textarea
              value={addDraft.description}
              onChange={(event) =>
                setAddDraftByParentId((previous) => ({
                  ...previous,
                  [conceptType.id]: { ...addDraft, description: event.target.value },
                }))
              }
              placeholder="Description"
            />
            <input
              type="number"
              min={1}
              step={1}
              value={addDraft.partOrder}
              onChange={(event) =>
                setAddDraftByParentId((previous) => ({
                  ...previous,
                  [conceptType.id]: { ...addDraft, partOrder: event.target.value },
                }))
              }
              placeholder="Order within parent (optional, default 1)"
            />
            <label>
              ReferenceTo MetaModel type (optional)
              <select
                value={addDraft.referenceToConceptTypeId}
                onChange={(event) =>
                  setAddDraftByParentId((previous) => ({
                    ...previous,
                    [conceptType.id]: { ...addDraft, referenceToConceptTypeId: event.target.value },
                  }))
                }
              >
                <option value="">(none)</option>
                {referenceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.id})
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              <button type="button" onClick={() => void handleCreateChild(conceptType.id)} disabled={!addDraft.name.trim()}>
                Add child
              </button>
              <button type="button" onClick={() => toggleAddPanel(conceptType.id)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {showEditControls && editPanelById[conceptType.id] ? (
          <div className="maintainInlineForm">
            <p className="meta">Edit MetaModel type</p>
            <input
              value={editDraft.name}
              onChange={(event) =>
                setEditDraftById((previous) => ({
                  ...previous,
                  [conceptType.id]: { ...editDraft, name: event.target.value },
                }))
              }
              placeholder="Name"
            />
            <textarea
              value={editDraft.description}
              onChange={(event) =>
                setEditDraftById((previous) => ({
                  ...previous,
                  [conceptType.id]: { ...editDraft, description: event.target.value },
                }))
              }
              placeholder="Description"
            />
            {parentId ? (
              <input
                type="number"
                min={1}
                step={1}
                value={editDraft.partOrder}
                onChange={(event) =>
                  setEditDraftById((previous) => ({
                    ...previous,
                    [conceptType.id]: { ...editDraft, partOrder: event.target.value },
                  }))
                }
                placeholder="Order within parent"
              />
            ) : null}
            <label>
              ReferenceTo MetaModel type (optional)
              <select
                value={editDraft.referenceToConceptTypeId}
                onChange={(event) =>
                  setEditDraftById((previous) => ({
                    ...previous,
                    [conceptType.id]: { ...editDraft, referenceToConceptTypeId: event.target.value },
                  }))
                }
              >
                <option value="">(none)</option>
                {editReferenceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.id})
                  </option>
                ))}
              </select>
            </label>
            {!parentId ? <p className="hint">ReferenceTo is only valid when PartOf is set; root types save with ReferenceTo cleared.</p> : null}
            <div className="actions">
              <button type="button" onClick={() => void handleSaveEdit(conceptType)} disabled={!editDraft.name.trim()}>
                Save
              </button>
              <button type="button" onClick={() => closeEditPanel(conceptType.id)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {canRenderChildrenByDepth && children.length > 0 ? (
          <ul className="treeList">{children.map((child) => renderNode(child, conceptType.id, nextVisited, currentDepth + 1))}</ul>
        ) : null}
      </li>
    )
  }

  return (
    <div className="maintainInlineForm">
      <div className="viewControls">
        <label>
          Tree depth
          <select
            value={depthSelectValue}
            onChange={(event) => {
              const nextValue = event.target.value
              if (nextValue === 'all') {
                setMaxTreeDepth(null)
                return
              }

              setMaxTreeDepth(Number.parseInt(nextValue, 10))
            }}
          >
            <option value="all">All</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
          </select>
        </label>
      </div>

      <label className="inlineToggle">
        <input
          type="checkbox"
          checked={showEditControls}
          onChange={(event) => setShowEditControls(event.target.checked)}
        />
        Show edit controls
      </label>

      {showEditControls && !selectedRoot ? (
        <div className="maintainInlineForm">
          <p className="meta">Add root MetaModel type</p>
          <input
            value={rootDraft.name}
            onChange={(event) => setRootDraft((previous) => ({ ...previous, name: event.target.value }))}
            placeholder="Name"
          />
          <textarea
            value={rootDraft.description}
            onChange={(event) => setRootDraft((previous) => ({ ...previous, description: event.target.value }))}
            placeholder="Description"
          />
          <div className="actions">
            <button type="button" onClick={() => void handleCreateRoot()} disabled={!rootDraft.name.trim()}>
              Add root
            </button>
          </div>
        </div>
      ) : null}

      {showEditControls && selectedRoot ? (
        <p className="hint">Root creation is available in the MetaModel Type form above. Compact mode is scoped to the selected root tree.</p>
      ) : null}

      {selectedRoot ? (
        <ul className="treeList">
          <li className="treeNode">
            <div className="treeCompactRow treeTypeRow">
              <p>{selectedRoot.name}</p>
            </div>
            <ul className="treeList">{renderNode(selectedRoot, null, new Set(), 0)}</ul>
          </li>
        </ul>
      ) : (
        <p className="hint">Select a root MetaModel type to start compact maintenance.</p>
      )}
    </div>
  )
}
