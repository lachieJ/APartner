import { useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptPayload, ConceptRecord } from '../types'
import { MaintainConceptNode } from './MaintainConceptNode'
import { MaintainConceptTypeNode, type TypeNodeDraft } from './MaintainConceptTypeNode'
import { orderSiblings } from '../../shared/utils/siblingOrdering'
import { useConceptQueue } from '../hooks/useConceptQueue'
import {
  getCompactRootDraftKey,
  getRootConceptsForType,
  getRootOrDecomposableConceptTypes,
} from '../utils/conceptConventions'

type DraftValue = {
  name: string
  description: string
  bulkNames: string
}

type MaintainConceptBuilderProps = {
  conceptTypes: ConceptTypeRecord[]
  concepts: ConceptRecord[]
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
}

export function MaintainConceptBuilder({ conceptTypes, concepts, onCreateConcept }: MaintainConceptBuilderProps) {
  const [selectedStartTypeId, setSelectedStartTypeId] = useState('')
  const [draftByKey, setDraftByKey] = useState<Record<string, DraftValue>>({})
  const [typeNodeDraftByTypeId, setTypeNodeDraftByTypeId] = useState<Record<string, TypeNodeDraft>>({})
  const [expandedTypeIds, setExpandedTypeIds] = useState<Set<string>>(new Set())

  const startTypeOptions = useMemo(() => getRootOrDecomposableConceptTypes(conceptTypes), [conceptTypes])

  const conceptTypeById = useMemo(
    () => new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType])),
    [conceptTypes],
  )

  const conceptById = useMemo(() => new Map(concepts.map((concept) => [concept.id, concept])), [concepts])

  const childConceptTypesByParentTypeId = useMemo(() => {
    const children = new Map<string, ConceptTypeRecord[]>()

    for (const conceptType of conceptTypes) {
      if (!conceptType.part_of_concept_type_id) {
        continue
      }

      const siblings = children.get(conceptType.part_of_concept_type_id) ?? []
      siblings.push(conceptType)
      children.set(conceptType.part_of_concept_type_id, siblings)
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

    return children
  }, [concepts])

  const rootConcepts = useMemo(
    () => getRootConceptsForType(concepts, selectedStartTypeId),
    [concepts, selectedStartTypeId],
  )

  const selectedStartType = selectedStartTypeId ? conceptTypeById.get(selectedStartTypeId) ?? null : null

  const {
    stagedConcepts,
    stagedConceptsWithLabels,
    stagedValidation,
    committing,
    queueStatus,
    queueError,
    queueImportReport,
    stageConcept,
    removeStagedConcept,
    updateStagedConcept,
    removeConflictingStagedConcepts,
    clearAllStagedConcepts,
    exportQueueAsJson,
    importQueueFromFile,
    commitStagedConcepts,
    commitNonConflictingStagedConcepts,
  } = useConceptQueue({
    concepts,
    conceptTypeById,
    conceptById,
    onCreateConcept,
  })

  const rootDraftKey = getCompactRootDraftKey(selectedStartTypeId)
  const rootDraft = draftByKey[rootDraftKey] ?? { name: '', description: '', bulkNames: '' }

  const setRootDraft = (next: Partial<DraftValue>) => {
    setDraftByKey((previous) => ({
      ...previous,
      [rootDraftKey]: {
        ...(previous[rootDraftKey] ?? { name: '', description: '', bulkNames: '' }),
        ...next,
      },
    }))
  }

  const clearRootDraft = () => {
    setDraftByKey((previous) => {
      if (!previous[rootDraftKey]) {
        return previous
      }

      const next = { ...previous }
      delete next[rootDraftKey]
      return next
    })
  }

  const setTypeNodeDraft = (conceptTypeId: string, next: Partial<TypeNodeDraft>) => {
    setTypeNodeDraftByTypeId((previous) => ({
      ...previous,
      [conceptTypeId]: {
        ...(previous[conceptTypeId] ?? { name: '', description: '', parentConceptId: '' }),
        ...next,
      },
    }))
  }

  const toggleTypeExpanded = (conceptTypeId: string) => {
    setExpandedTypeIds((previous) => {
      const next = new Set(previous)
      if (next.has(conceptTypeId)) {
        next.delete(conceptTypeId)
      } else {
        next.add(conceptTypeId)
      }
      return next
    })
  }

  const ensureTypeExpanded = (conceptTypeId: string) => {
    setExpandedTypeIds((previous) => {
      if (previous.has(conceptTypeId)) {
        return previous
      }

      const next = new Set(previous)
      next.add(conceptTypeId)
      return next
    })
  }

  const handleAddRootConcept = async () => {
    if (!selectedStartTypeId || !rootDraft.name.trim()) {
      return
    }

    await onCreateConcept({
      name: rootDraft.name.trim(),
      description: rootDraft.description.trim() ? rootDraft.description.trim() : null,
      concept_type_id: selectedStartTypeId,
      part_of_concept_id: null,
      part_order: null,
      reference_to_concept_id: null,
    })

    clearRootDraft()
  }

  const handleAddRootSiblings = async () => {
    if (!selectedStartTypeId) {
      return
    }

    const names = Array.from(
      new Set(
        rootDraft.bulkNames
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    )

    if (names.length === 0) {
      return
    }

    for (const conceptName of names) {
      await onCreateConcept({
        name: conceptName,
        description: null,
        concept_type_id: selectedStartTypeId,
        part_of_concept_id: null,
        part_order: null,
        reference_to_concept_id: null,
      })
    }

    setRootDraft({ bulkNames: '' })
  }

  const handleStageRootConcept = () => {
    if (!selectedStartTypeId || !rootDraft.name.trim()) {
      return
    }

    stageConcept({
      name: rootDraft.name.trim(),
      description: rootDraft.description.trim() ? rootDraft.description.trim() : null,
      concept_type_id: selectedStartTypeId,
      part_of_concept_id: null,
      part_order: null,
      reference_to_concept_id: null,
    })

    setRootDraft({ name: '', description: '' })
  }

  const handleStageRootSiblings = () => {
    if (!selectedStartTypeId) {
      return
    }

    const names = Array.from(
      new Set(
        rootDraft.bulkNames
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    )

    if (names.length === 0) {
      return
    }

    for (const conceptName of names) {
      stageConcept({
        name: conceptName,
        description: null,
        concept_type_id: selectedStartTypeId,
        part_of_concept_id: null,
        part_order: null,
        reference_to_concept_id: null,
      })
    }

    setRootDraft({ bulkNames: '' })
  }

  const sortedConceptTypeOptions = [...conceptTypes].sort((left, right) => left.name.localeCompare(right.name))

  return (
    <section className="card">
      <h2>Maintain Concepts (Guided)</h2>
      <p className="hint">
        Start from a root or self-decomposable ConceptType, then progressively add concepts and child concepts based on
        valid PartOf type semantics.
      </p>

      <div className="viewControls">
        <label>
          Start ConceptType
          <select
            value={selectedStartTypeId}
            onChange={(event) => {
              const nextStartTypeId = event.target.value
              setSelectedStartTypeId(nextStartTypeId)
              if (nextStartTypeId) {
                ensureTypeExpanded(nextStartTypeId)
              }
            }}
          >
            <option value="">(select)</option>
            {startTypeOptions.map((conceptType) => (
              <option key={conceptType.id} value={conceptType.id}>
                {conceptType.name} ({conceptType.id})
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedStartType ? (
        <div className="maintainInlineForm">
          <p className="meta">ConceptType tree quick add</p>
          <p className="hint">Add instances directly from relevant ConceptType nodes.</p>
          <ul className="treeList">
            <MaintainConceptTypeNode
              conceptType={selectedStartType}
              childConceptTypesByParentTypeId={childConceptTypesByParentTypeId}
              concepts={concepts}
              draftByTypeId={typeNodeDraftByTypeId}
              onDraftChange={setTypeNodeDraft}
              onAddInstance={onCreateConcept}
              expandedTypeIds={expandedTypeIds}
              onToggleExpanded={toggleTypeExpanded}
              onEnsureExpanded={ensureTypeExpanded}
              visited={new Set()}
            />
          </ul>
        </div>
      ) : null}

      {selectedStartType ? (
        <div className="maintainInlineForm">
          <p className="meta">Add {selectedStartType.name} concept</p>
          <input
            value={rootDraft.name}
            onChange={(event) => setRootDraft({ name: event.target.value })}
            placeholder={`New ${selectedStartType.name} name`}
          />
          <input
            value={rootDraft.description}
            onChange={(event) => setRootDraft({ description: event.target.value })}
            placeholder="Optional description"
          />
          <textarea
            value={rootDraft.bulkNames}
            onChange={(event) => setRootDraft({ bulkNames: event.target.value })}
            placeholder="Quick add root concepts: comma or newline separated names"
          />
          <div className="actions">
            <button type="button" onClick={() => void handleAddRootConcept()} disabled={!rootDraft.name.trim()}>
              Add root concept
            </button>
            <button type="button" onClick={handleStageRootConcept} disabled={!rootDraft.name.trim()}>
              Stage root concept
            </button>
            <button type="button" onClick={() => void handleAddRootSiblings()} disabled={!rootDraft.bulkNames.trim()}>
              Add root siblings
            </button>
            <button type="button" onClick={handleStageRootSiblings} disabled={!rootDraft.bulkNames.trim()}>
              Stage root siblings
            </button>
          </div>
        </div>
      ) : null}

      <div className="maintainInlineForm">
        <p className="meta">Draft queue ({stagedConcepts.length})</p>
        <div className="actions">
          <button type="button" onClick={exportQueueAsJson} disabled={stagedConcepts.length === 0}>
            Export queue JSON
          </button>
          <label className="inlineToggle">
            <span>Import queue JSON</span>
            <input type="file" accept=".json,application/json" onChange={(event) => void importQueueFromFile(event)} />
          </label>
        </div>
        {queueStatus ? <p className="fileStatus">{queueStatus}</p> : null}
        {queueError ? <p className="fileError">{queueError}</p> : null}
        {queueImportReport ? (
          <div className="importSummary">
            <p>
              <strong>Queue import report:</strong> Source {queueImportReport.sourceFormat} →{' '}
              {queueImportReport.normalizedTo} | Candidates {queueImportReport.totalCandidates} | Imported{' '}
              {queueImportReport.importedCount} | Skipped {queueImportReport.skippedCount}
            </p>
            {queueImportReport.migrationMessage ? <p>{queueImportReport.migrationMessage}</p> : null}
            {queueImportReport.skippedSamples.length > 0 ? (
              <>
                <p className="meta">Skipped samples (up to 5):</p>
                <ul>
                  {queueImportReport.skippedSamples.map((sample) => (
                    <li key={sample}>{sample}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
        <p className="meta">
          Commit preview: roots {stagedValidation.rootCount} | children {stagedValidation.childCount}
        </p>
        {stagedValidation.byType.length > 0 ? (
          <p className="meta">
            By type:{' '}
            {stagedValidation.byType
              .map(([typeName, count]) => `${typeName} (${count})`)
              .join(' | ')}
          </p>
        ) : null}
        {stagedValidation.conflictWithExistingIds.size > 0 ? (
          <p className="fileError">
            Conflict: {stagedValidation.conflictWithExistingIds.size} staged item(s) duplicate existing concept names in
            the same ConceptType.
          </p>
        ) : null}
        {stagedValidation.duplicateInQueueIds.size > 0 ? (
          <p className="fileError">
            Conflict: {stagedValidation.duplicateInQueueIds.size} staged item(s) are duplicates within the queue.
          </p>
        ) : null}
        {stagedConcepts.length === 0 ? <p className="hint">No staged concept additions.</p> : null}
        {stagedConceptsWithLabels.map((staged) => (
          <div key={staged.id} className="maintainInlineForm">
            <p className="meta">
              {staged.payload.name} | Type: {staged.typeName}
              {staged.parentName ? ` | Parent: ${staged.parentName}` : ''}
              {stagedValidation.conflictWithExistingIds.has(staged.id)
                ? ' | CONFLICT: duplicates existing'
                : ''}
              {stagedValidation.duplicateInQueueIds.has(staged.id) ? ' | CONFLICT: duplicates queue' : ''}
            </p>
            <input
              value={staged.payload.name}
              onChange={(event) => updateStagedConcept(staged.id, { name: event.target.value })}
              placeholder="Concept name"
            />
            <input
              value={staged.payload.description ?? ''}
              onChange={(event) =>
                updateStagedConcept(staged.id, {
                  description: event.target.value.trim() ? event.target.value : null,
                })
              }
              placeholder="Optional description"
            />
            <label>
              ConceptType
              <select
                value={staged.payload.concept_type_id}
                onChange={(event) => {
                  const nextTypeId = event.target.value
                  const nextType = conceptTypeById.get(nextTypeId)
                  const expectedParentTypeId = nextType?.part_of_concept_type_id ?? null
                  const currentParentId = staged.payload.part_of_concept_id
                  const currentParent = currentParentId ? conceptById.get(currentParentId) : null
                  const keepParent =
                    expectedParentTypeId && currentParent && currentParent.concept_type_id === expectedParentTypeId

                  updateStagedConcept(staged.id, {
                    concept_type_id: nextTypeId,
                    part_of_concept_id: keepParent ? currentParentId : null,
                  })
                }}
              >
                {sortedConceptTypeOptions.map((conceptType) => (
                  <option key={conceptType.id} value={conceptType.id}>
                    {conceptType.name} ({conceptType.id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Parent Concept
              <select
                value={staged.payload.part_of_concept_id ?? ''}
                onChange={(event) =>
                  updateStagedConcept(staged.id, {
                    part_of_concept_id: event.target.value || null,
                  })
                }
              >
                <option value="">(none)</option>
                {concepts
                  .filter((concept) => {
                    const selectedType = conceptTypeById.get(staged.payload.concept_type_id)
                    const expectedParentTypeId = selectedType?.part_of_concept_type_id
                    if (!expectedParentTypeId) {
                      return false
                    }

                    return concept.concept_type_id === expectedParentTypeId
                  })
                  .sort((left, right) => left.name.localeCompare(right.name))
                  .map((concept) => (
                    <option key={concept.id} value={concept.id}>
                      {concept.name} ({concept.id})
                    </option>
                  ))}
              </select>
            </label>
            <div className="actions">
              <button type="button" onClick={() => removeStagedConcept(staged.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="actions">
          <button
            type="button"
            onClick={() => void commitStagedConcepts()}
            disabled={stagedConcepts.length === 0 || committing || stagedValidation.hasConflicts}
          >
            {committing ? 'Committing...' : 'Commit staged concepts'}
          </button>
          <button
            type="button"
            onClick={() => void commitNonConflictingStagedConcepts()}
            disabled={
              stagedConcepts.length === 0 ||
              committing ||
              stagedConcepts.every(
                (staged) =>
                  stagedValidation.conflictWithExistingIds.has(staged.id) ||
                  stagedValidation.duplicateInQueueIds.has(staged.id),
              )
            }
          >
            {committing ? 'Committing...' : 'Commit non-conflicting only'}
          </button>
          <button
            type="button"
            onClick={removeConflictingStagedConcepts}
            disabled={
              stagedConcepts.length === 0 ||
              (!stagedValidation.hasConflicts &&
                stagedConcepts.every(
                  (staged) =>
                    !stagedValidation.conflictWithExistingIds.has(staged.id) &&
                    !stagedValidation.duplicateInQueueIds.has(staged.id),
                ))
            }
          >
            Remove all conflicting
          </button>
          <button type="button" onClick={clearAllStagedConcepts} disabled={stagedConcepts.length === 0}>
            Clear queue
          </button>
        </div>
      </div>

      {selectedStartTypeId && rootConcepts.length === 0 ? (
        <p className="hint">No root concepts yet for this start type.</p>
      ) : null}

      {rootConcepts.length > 0 ? (
        <ul className="treeList">
          {rootConcepts.map((concept) => (
            <MaintainConceptNode
              key={concept.id}
              concept={concept}
              conceptById={conceptById}
              conceptTypeById={conceptTypeById}
              childrenByParentConceptId={childrenByParentConceptId}
              childConceptTypesByParentTypeId={childConceptTypesByParentTypeId}
              draftByKey={draftByKey}
              setDraftByKey={setDraftByKey}
              onCreateConcept={onCreateConcept}
              onStageConcept={stageConcept}
            />
          ))}
        </ul>
      ) : null}
    </section>
  )
}
