import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import type { ConceptPayload, ConceptRecord } from '../types'

type DraftValue = {
  name: string
  description: string
  bulkNames: string
}

type MaintainConceptNodeProps = {
  concept: ConceptRecord
  conceptById: Map<string, ConceptRecord>
  conceptTypeById: Map<string, ConceptTypeRecord>
  childrenByParentConceptId: Map<string, ConceptRecord[]>
  childConceptTypesByParentTypeId: Map<string, ConceptTypeRecord[]>
  draftByKey: Record<string, DraftValue>
  setDraftByKey: Dispatch<SetStateAction<Record<string, DraftValue>>>
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
  onStageConcept: (payload: ConceptPayload) => void
}

export function MaintainConceptNode({
  concept,
  conceptById,
  conceptTypeById,
  childrenByParentConceptId,
  childConceptTypesByParentTypeId,
  draftByKey,
  setDraftByKey,
  onCreateConcept,
  onStageConcept,
}: MaintainConceptNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const conceptType = conceptTypeById.get(concept.concept_type_id)
  const childTypeOptions = useMemo(
    () => childConceptTypesByParentTypeId.get(concept.concept_type_id) ?? [],
    [childConceptTypesByParentTypeId, concept.concept_type_id],
  )

  const childConcepts = useMemo(() => {
    const values = childrenByParentConceptId.get(concept.id) ?? []
    return [...values].sort((left, right) => {
      const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }

      return left.name.localeCompare(right.name)
    })
  }, [childrenByParentConceptId, concept.id])

  const getDraftKey = (parentConceptId: string, childConceptTypeId: string) =>
    `${parentConceptId}::${childConceptTypeId}`

  const updateDraft = (parentConceptId: string, childConceptTypeId: string, next: Partial<DraftValue>) => {
    const key = getDraftKey(parentConceptId, childConceptTypeId)
    setDraftByKey((previous) => {
      const current = previous[key] ?? { name: '', description: '', bulkNames: '' }
      return {
        ...previous,
        [key]: {
          ...current,
          ...next,
        },
      }
    })
  }

  const clearDraft = (parentConceptId: string, childConceptTypeId: string) => {
    const key = getDraftKey(parentConceptId, childConceptTypeId)
    setDraftByKey((previous) => {
      if (!previous[key]) {
        return previous
      }

      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  const handleCreateChild = async (childConceptTypeId: string) => {
    const key = getDraftKey(concept.id, childConceptTypeId)
    const draft = draftByKey[key] ?? { name: '', description: '', bulkNames: '' }

    if (!draft.name.trim()) {
      return
    }

    const success = await onCreateConcept({
      name: draft.name.trim(),
      description: draft.description.trim() ? draft.description.trim() : null,
      concept_type_id: childConceptTypeId,
      part_of_concept_id: concept.id,
      part_order: null,
      reference_to_concept_id: null,
    })

    if (success) {
      clearDraft(concept.id, childConceptTypeId)
    }
  }

  const handleCreateChildSiblings = async (childConceptTypeId: string) => {
    const key = getDraftKey(concept.id, childConceptTypeId)
    const draft = draftByKey[key] ?? { name: '', description: '', bulkNames: '' }

    const names = Array.from(
      new Set(
        draft.bulkNames
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    )

    if (names.length === 0) {
      return
    }

    for (const siblingName of names) {
      await onCreateConcept({
        name: siblingName,
        description: null,
        concept_type_id: childConceptTypeId,
        part_of_concept_id: concept.id,
        part_order: null,
        reference_to_concept_id: null,
      })
    }

    updateDraft(concept.id, childConceptTypeId, { bulkNames: '' })
  }

  const handleStageChild = (childConceptTypeId: string) => {
    const key = getDraftKey(concept.id, childConceptTypeId)
    const draft = draftByKey[key] ?? { name: '', description: '', bulkNames: '' }

    if (!draft.name.trim()) {
      return
    }

    onStageConcept({
      name: draft.name.trim(),
      description: draft.description.trim() ? draft.description.trim() : null,
      concept_type_id: childConceptTypeId,
      part_of_concept_id: concept.id,
      part_order: null,
      reference_to_concept_id: null,
    })

    updateDraft(concept.id, childConceptTypeId, { name: '', description: '' })
  }

  const handleStageChildSiblings = (childConceptTypeId: string) => {
    const key = getDraftKey(concept.id, childConceptTypeId)
    const draft = draftByKey[key] ?? { name: '', description: '', bulkNames: '' }

    const names = Array.from(
      new Set(
        draft.bulkNames
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    )

    if (names.length === 0) {
      return
    }

    for (const siblingName of names) {
      onStageConcept({
        name: siblingName,
        description: null,
        concept_type_id: childConceptTypeId,
        part_of_concept_id: concept.id,
        part_order: null,
        reference_to_concept_id: null,
      })
    }

    updateDraft(concept.id, childConceptTypeId, { bulkNames: '' })
  }

  return (
    <li className="treeNode">
      <article className="row">
        <div>
          <div className="maintainNodeHeader">
            <h3>{concept.name}</h3>
            <button type="button" className="linkButton" onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <p className="meta">Type: {conceptType?.name ?? concept.concept_type_id}</p>
          {concept.reference_to_concept_id ? (
            <p className="meta">
              RefTo: {conceptById.get(concept.reference_to_concept_id)?.name ?? concept.reference_to_concept_id}
            </p>
          ) : null}
          {concept.description ? <p>{concept.description}</p> : null}

          {expanded && childTypeOptions.length > 0 ? (
            <div className="maintainChildForms">
              {childTypeOptions.map((childType) => {
                const key = getDraftKey(concept.id, childType.id)
                const draft = draftByKey[key] ?? { name: '', description: '', bulkNames: '' }

                return (
                  <div key={`${concept.id}-${childType.id}`} className="maintainInlineForm">
                    <p className="meta">Add {childType.name}</p>
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft(concept.id, childType.id, { name: event.target.value })}
                      placeholder={`New ${childType.name} name`}
                    />
                    <input
                      value={draft.description}
                      onChange={(event) =>
                        updateDraft(concept.id, childType.id, { description: event.target.value })
                      }
                      placeholder="Optional description"
                    />
                    <textarea
                      value={draft.bulkNames}
                      onChange={(event) =>
                        updateDraft(concept.id, childType.id, { bulkNames: event.target.value })
                      }
                      placeholder="Quick add siblings: comma or newline separated names"
                    />
                    <div className="actions">
                      <button
                        type="button"
                        onClick={() => {
                          void handleCreateChild(childType.id)
                        }}
                        disabled={!draft.name.trim()}
                      >
                        Add child
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStageChild(childType.id)}
                        disabled={!draft.name.trim()}
                      >
                        Stage child
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleCreateChildSiblings(childType.id)
                        }}
                        disabled={!draft.bulkNames.trim()}
                      >
                        Add siblings
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStageChildSiblings(childType.id)}
                        disabled={!draft.bulkNames.trim()}
                      >
                        Stage siblings
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : expanded ? (
            <p className="hint">No child metamodel types are defined for this metamodel type.</p>
          ) : null}
        </div>
      </article>

      {expanded && childConcepts.length > 0 ? (
        <ul className="treeList">
          {childConcepts.map((child) => (
            <MaintainConceptNode
              key={child.id}
              concept={child}
              conceptById={conceptById}
              conceptTypeById={conceptTypeById}
              childrenByParentConceptId={childrenByParentConceptId}
              childConceptTypesByParentTypeId={childConceptTypesByParentTypeId}
              draftByKey={draftByKey}
              setDraftByKey={setDraftByKey}
              onCreateConcept={onCreateConcept}
              onStageConcept={onStageConcept}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
