import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptPayload, ConceptRecord } from '../types'

export type TypeNodeDraft = {
  name: string
  description: string
  parentConceptId: string
}

type MaintainConceptTypeNodeProps = {
  conceptType: ConceptTypeRecord
  childConceptTypesByParentTypeId: Map<string, ConceptTypeRecord[]>
  concepts: ConceptRecord[]
  draftByTypeId: Record<string, TypeNodeDraft>
  onDraftChange: (conceptTypeId: string, next: Partial<TypeNodeDraft>) => void
  onAddInstance: (payload: ConceptPayload) => Promise<boolean>
  expandedTypeIds: Set<string>
  onToggleExpanded: (conceptTypeId: string) => void
  onEnsureExpanded: (conceptTypeId: string) => void
  visited: Set<string>
}

export function MaintainConceptTypeNode({
  conceptType,
  childConceptTypesByParentTypeId,
  concepts,
  draftByTypeId,
  onDraftChange,
  onAddInstance,
  expandedTypeIds,
  onToggleExpanded,
  onEnsureExpanded,
  visited,
}: MaintainConceptTypeNodeProps) {
  const draft = draftByTypeId[conceptType.id] ?? { name: '', description: '', parentConceptId: '' }
  const isExpanded = expandedTypeIds.has(conceptType.id)
  const instanceCount = concepts.filter((concept) => concept.concept_type_id === conceptType.id).length
  const expectedParentTypeId = conceptType.part_of_concept_type_id
  const requiresParentSelection = Boolean(expectedParentTypeId && expectedParentTypeId !== conceptType.id)

  const availableParents = expectedParentTypeId
    ? concepts
        .filter((concept) => concept.concept_type_id === expectedParentTypeId)
        .sort((left, right) => left.name.localeCompare(right.name))
    : []

  const childTypes = (childConceptTypesByParentTypeId.get(conceptType.id) ?? []).filter(
    (childType) => childType.id !== conceptType.id && !visited.has(childType.id),
  )
  const showChildTypeNodes = instanceCount > 0

  const resolvedParentConceptId =
    draft.parentConceptId || (requiresParentSelection && availableParents.length === 1 ? availableParents[0].id : null)

  const canAdd =
    draft.name.trim().length > 0 &&
    (!requiresParentSelection || availableParents.length === 0 || Boolean(resolvedParentConceptId))

  const handleAddInstance = async () => {
    if (!canAdd) {
      return
    }

    const success = await onAddInstance({
      name: draft.name.trim(),
      description: draft.description.trim() ? draft.description.trim() : null,
      concept_type_id: conceptType.id,
      part_of_concept_id: resolvedParentConceptId,
      part_order: null,
      reference_to_concept_id: null,
    })

    if (success) {
      onDraftChange(conceptType.id, {
        name: '',
        description: '',
      })
      onEnsureExpanded(conceptType.id)
      for (const childType of childTypes) {
        onEnsureExpanded(childType.id)
      }
    }
  }

  const nextVisited = new Set(visited)
  nextVisited.add(conceptType.id)

  return (
    <li className="treeNode">
      <article className="row">
        <div>
          <div className="maintainNodeHeader">
            <h3>{conceptType.name}</h3>
            <button type="button" className="linkButton" onClick={() => onToggleExpanded(conceptType.id)}>
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <p className="meta">
            TypeId: {conceptType.id} | Instances: {instanceCount}
          </p>

          {isExpanded ? (
            <div className="maintainInlineForm">
              <p className="meta">Add instance</p>
              <input
                value={draft.name}
                onChange={(event) => onDraftChange(conceptType.id, { name: event.target.value })}
                placeholder={`New ${conceptType.name} name`}
              />
              <input
                value={draft.description}
                onChange={(event) => onDraftChange(conceptType.id, { description: event.target.value })}
                placeholder="Optional description"
              />

              {expectedParentTypeId ? (
                <label>
                  Parent Concept
                  <select
                    value={draft.parentConceptId}
                    onChange={(event) => onDraftChange(conceptType.id, { parentConceptId: event.target.value })}
                  >
                    <option value="">{requiresParentSelection ? '(select parent)' : '(none)'}</option>
                    {availableParents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name} ({parent.id})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {requiresParentSelection && availableParents.length === 0 ? (
                <p className="hint">Create a parent concept first to add this child type.</p>
              ) : null}

              <div className="actions">
                <button type="button" onClick={() => void handleAddInstance()} disabled={!canAdd}>
                  Add instance
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      {isExpanded && showChildTypeNodes && childTypes.length > 0 ? (
        <ul className="treeList">
          {childTypes.map((childType) => (
            <MaintainConceptTypeNode
              key={childType.id}
              conceptType={childType}
              childConceptTypesByParentTypeId={childConceptTypesByParentTypeId}
              concepts={concepts}
              draftByTypeId={draftByTypeId}
              onDraftChange={onDraftChange}
              onAddInstance={onAddInstance}
              expandedTypeIds={expandedTypeIds}
              onToggleExpanded={onToggleExpanded}
              onEnsureExpanded={onEnsureExpanded}
              visited={nextVisited}
            />
          ))}
        </ul>
      ) : isExpanded && !showChildTypeNodes && childTypes.length > 0 ? (
        <p className="hint">Add at least one {conceptType.name} instance to reveal child ConceptType actions.</p>
      ) : null}
    </li>
  )
}