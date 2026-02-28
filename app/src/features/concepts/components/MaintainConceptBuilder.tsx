import { type ChangeEvent, useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import type { ConceptPayload, ConceptRecord } from '../types'
import { MaintainConceptNode } from './MaintainConceptNode'

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

type StagedConcept = {
  id: string
  payload: ConceptPayload
}

type QueueSnapshot = {
  version: 'concept-queue-v1'
  exportedAt: string
  items: ConceptPayload[]
}

type LegacyQueueSnapshotV0 = {
  version: 'concept-queue-v0'
  exportedAt?: string
  queuedConcepts: unknown[]
}

type QueueImportNormalization = {
  items: unknown[]
  sourceFormat: string
  normalizedTo: 'concept-queue-v1'
  migrationMessage: string | null
}

type QueueImportReport = {
  sourceFormat: string
  normalizedTo: 'concept-queue-v1'
  totalCandidates: number
  importedCount: number
  skippedCount: number
  skippedSamples: string[]
  migrationMessage: string | null
}

export function MaintainConceptBuilder({ conceptTypes, concepts, onCreateConcept }: MaintainConceptBuilderProps) {
  const [selectedStartTypeId, setSelectedStartTypeId] = useState('')
  const [draftByKey, setDraftByKey] = useState<Record<string, DraftValue>>({})
  const [stagedConcepts, setStagedConcepts] = useState<StagedConcept[]>([])
  const [committing, setCommitting] = useState(false)
  const [queueStatus, setQueueStatus] = useState<string | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [queueImportReport, setQueueImportReport] = useState<QueueImportReport | null>(null)

  const startTypeOptions = useMemo(
    () =>
      conceptTypes
        .filter(
          (conceptType) =>
            !conceptType.part_of_concept_type_id || conceptType.part_of_concept_type_id === conceptType.id,
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [conceptTypes],
  )

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
      values.sort((left, right) => left.name.localeCompare(right.name))
      children.set(parentTypeId, values)
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

  const rootConcepts = useMemo(() => {
    if (!selectedStartTypeId) {
      return []
    }

    return concepts
      .filter((concept) => concept.concept_type_id === selectedStartTypeId && !concept.part_of_concept_id)
      .sort((left, right) => {
        const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
        const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder
        }

        return left.name.localeCompare(right.name)
      })
  }, [concepts, selectedStartTypeId])

  const selectedStartType = selectedStartTypeId ? conceptTypeById.get(selectedStartTypeId) ?? null : null

  const rootDraftKey = selectedStartTypeId ? `ROOT::${selectedStartTypeId}` : 'ROOT::'
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

  const stageConcept = (payload: ConceptPayload) => {
    setQueueStatus(null)
    setQueueError(null)
    setQueueImportReport(null)
    setStagedConcepts((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        payload,
      },
    ])
  }

  const removeStagedConcept = (id: string) => {
    setQueueStatus(null)
    setQueueError(null)
    setQueueImportReport(null)
    setStagedConcepts((previous) => previous.filter((item) => item.id !== id))
  }

  const updateStagedConcept = (id: string, nextPayload: Partial<ConceptPayload>) => {
    setStagedConcepts((previous) =>
      previous.map((item) => {
        if (item.id !== id) {
          return item
        }

        return {
          ...item,
          payload: {
            ...item.payload,
            ...nextPayload,
          },
        }
      }),
    )
  }

  const removeConflictingStagedConcepts = () => {
    setQueueStatus(null)
    setQueueError(null)
    setQueueImportReport(null)
    setStagedConcepts((previous) =>
      previous.filter(
        (item) =>
          !stagedValidation.conflictWithExistingIds.has(item.id) &&
          !stagedValidation.duplicateInQueueIds.has(item.id),
      ),
    )
  }

  const clearAllStagedConcepts = () => {
    setQueueStatus(null)
    setQueueError(null)
    setQueueImportReport(null)
    setStagedConcepts([])
  }

  const createStagedConceptFromPayload = (payload: ConceptPayload): StagedConcept => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
  })

  const exportQueueAsJson = () => {
    setQueueStatus(null)
    setQueueError(null)
    setQueueImportReport(null)

    const snapshot: QueueSnapshot = {
      version: 'concept-queue-v1',
      exportedAt: new Date().toISOString(),
      items: stagedConcepts.map((staged) => staged.payload),
    }

    const blob = new Blob([`${JSON.stringify(snapshot, null, 2)}\n`], {
      type: 'application/json;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `concept-queue-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    setQueueStatus(`Exported ${stagedConcepts.length} staged item(s) to JSON.`)
  }

  const parseQueuePayload = (value: unknown): ConceptPayload | null => {
    if (!value || typeof value !== 'object') {
      return null
    }

    const maybePayload = value as Record<string, unknown>
    const name = typeof maybePayload.name === 'string' ? maybePayload.name.trim() : ''
    const conceptTypeId =
      typeof maybePayload.concept_type_id === 'string' ? maybePayload.concept_type_id.trim() : ''

    if (!name || !conceptTypeId) {
      return null
    }

    const descriptionRaw = maybePayload.description
    const description = typeof descriptionRaw === 'string' ? descriptionRaw : null

    const partOfRaw = maybePayload.part_of_concept_id
    const partOfConceptId = typeof partOfRaw === 'string' && partOfRaw.trim() ? partOfRaw : null

    const partOrderRaw = maybePayload.part_order
    const partOrder =
      typeof partOrderRaw === 'number' && Number.isInteger(partOrderRaw) && partOrderRaw >= 1
        ? partOrderRaw
        : null

    const referenceRaw = maybePayload.reference_to_concept_id
    const referenceToConceptId = typeof referenceRaw === 'string' && referenceRaw.trim() ? referenceRaw : null

    return {
      name,
      description,
      concept_type_id: conceptTypeId,
      part_of_concept_id: partOfConceptId,
      part_order: partOrder,
      reference_to_concept_id: referenceToConceptId,
    }
  }

  const parseLegacyQueuePayload = (value: unknown): ConceptPayload | null => {
    if (!value || typeof value !== 'object') {
      return null
    }

    const legacy = value as Record<string, unknown>
    const name = typeof legacy.name === 'string' ? legacy.name.trim() : ''
    const conceptTypeId =
      typeof legacy.conceptTypeId === 'string' ? legacy.conceptTypeId.trim() :
      typeof legacy.concept_type_id === 'string' ? legacy.concept_type_id.trim() : ''

    if (!name || !conceptTypeId) {
      return null
    }

    const description =
      typeof legacy.description === 'string'
        ? legacy.description
        : null

    const partOfConceptId =
      typeof legacy.partOfConceptId === 'string' && legacy.partOfConceptId.trim()
        ? legacy.partOfConceptId
        : typeof legacy.part_of_concept_id === 'string' && legacy.part_of_concept_id.trim()
          ? legacy.part_of_concept_id
          : null

    const rawLegacyPartOrder =
      typeof legacy.partOrder === 'number'
        ? legacy.partOrder
        : typeof legacy.part_of_order === 'number'
          ? legacy.part_of_order
          : typeof legacy.part_order === 'number'
            ? legacy.part_order
            : null
    const partOrder =
      typeof rawLegacyPartOrder === 'number' && Number.isInteger(rawLegacyPartOrder) && rawLegacyPartOrder >= 1
        ? rawLegacyPartOrder
        : null

    const referenceToConceptId =
      typeof legacy.referenceToConceptId === 'string' && legacy.referenceToConceptId.trim()
        ? legacy.referenceToConceptId
        : typeof legacy.reference_to_concept_id === 'string' && legacy.reference_to_concept_id.trim()
          ? legacy.reference_to_concept_id
          : null

    return {
      name,
      description,
      concept_type_id: conceptTypeId,
      part_of_concept_id: partOfConceptId,
      part_order: partOrder,
      reference_to_concept_id: referenceToConceptId,
    }
  }

  const normalizeImportedQueueData = (parsed: unknown): QueueImportNormalization => {
    if (Array.isArray(parsed)) {
      return {
        items: parsed,
        sourceFormat: 'legacy-array',
        normalizedTo: 'concept-queue-v1',
        migrationMessage: 'Imported legacy queue array format and normalized to concept-queue-v1.',
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { items: [], sourceFormat: 'unknown', normalizedTo: 'concept-queue-v1', migrationMessage: null }
    }

    const snapshot = parsed as Record<string, unknown>
    const version = typeof snapshot.version === 'string' ? snapshot.version : null

    if (version === 'concept-queue-v1' && Array.isArray(snapshot.items)) {
      return { items: snapshot.items, sourceFormat: 'concept-queue-v1', normalizedTo: 'concept-queue-v1', migrationMessage: null }
    }

    if (version === 'concept-queue-v0' && Array.isArray((snapshot as LegacyQueueSnapshotV0).queuedConcepts)) {
      return {
        items: (snapshot as LegacyQueueSnapshotV0).queuedConcepts,
        sourceFormat: 'concept-queue-v0',
        normalizedTo: 'concept-queue-v1',
        migrationMessage: 'Imported concept-queue-v0 and migrated to concept-queue-v1.',
      }
    }

    if (Array.isArray(snapshot.items)) {
      return {
        items: snapshot.items,
        sourceFormat: version ? `unknown-version:${version}` : 'unknown-snapshot-items',
        normalizedTo: 'concept-queue-v1',
        migrationMessage: 'Imported queue snapshot with unknown version and attempted v1-compatible normalization.',
      }
    }

    if (Array.isArray(snapshot.queuedConcepts)) {
      return {
        items: snapshot.queuedConcepts,
        sourceFormat: version ? `legacy-queuedConcepts:${version}` : 'legacy-queuedConcepts',
        normalizedTo: 'concept-queue-v1',
        migrationMessage: 'Imported queuedConcepts legacy snapshot and normalized to concept-queue-v1.',
      }
    }

    return { items: [], sourceFormat: 'unknown', normalizedTo: 'concept-queue-v1', migrationMessage: null }
  }

  const importQueueFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setQueueStatus(null)
    setQueueError(null)
    setQueueImportReport(null)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown

      const normalization = normalizeImportedQueueData(parsed)
      const candidateItems = normalization.items

      if (candidateItems.length === 0) {
        setQueueError('No queue items found in JSON file.')
        return
      }

      const parseResults = candidateItems.map((item) => parseQueuePayload(item) ?? parseLegacyQueuePayload(item))
      const validPayloads = parseResults.filter((payload): payload is ConceptPayload => payload !== null)

      if (validPayloads.length === 0) {
        setQueueError('Queue JSON format is invalid. No importable items found.')
        return
      }

      setStagedConcepts((previous) => [
        ...previous,
        ...validPayloads.map((payload) => createStagedConceptFromPayload(payload)),
      ])

      const skippedCount = candidateItems.length - validPayloads.length
      const skippedSamples = candidateItems
        .filter((_, index) => parseResults[index] === null)
        .slice(0, 5)
        .map((value, index) => {
          try {
            const serialized = JSON.stringify(value)
            return `Item ${index + 1}: ${serialized.length > 120 ? `${serialized.slice(0, 120)}…` : serialized}`
          } catch {
            return `Item ${index + 1}: [unserializable value]`
          }
        })

      setQueueImportReport({
        sourceFormat: normalization.sourceFormat,
        normalizedTo: normalization.normalizedTo,
        totalCandidates: candidateItems.length,
        importedCount: validPayloads.length,
        skippedCount,
        skippedSamples,
        migrationMessage: normalization.migrationMessage,
      })

      setQueueStatus(
        [
          skippedCount > 0
            ? `Imported ${validPayloads.length} staged item(s). Skipped ${skippedCount} invalid item(s).`
            : `Imported ${validPayloads.length} staged item(s).`,
          normalization.migrationMessage,
        ]
          .filter((part): part is string => Boolean(part))
          .join(' '),
      )
    } catch (caughtError) {
      setQueueError(caughtError instanceof Error ? caughtError.message : String(caughtError))
    } finally {
      event.target.value = ''
    }
  }

  const commitStagedConcepts = async () => {
    if (stagedConcepts.length === 0 || committing) {
      return
    }

    setCommitting(true)
    try {
      for (const staged of stagedConcepts) {
        await onCreateConcept(staged.payload)
      }
      setStagedConcepts([])
    } finally {
      setCommitting(false)
    }
  }

  const commitNonConflictingStagedConcepts = async () => {
    if (stagedConcepts.length === 0 || committing) {
      return
    }

    const committable = stagedConcepts.filter(
      (staged) =>
        !stagedValidation.conflictWithExistingIds.has(staged.id) &&
        !stagedValidation.duplicateInQueueIds.has(staged.id),
    )

    if (committable.length === 0) {
      return
    }

    setCommitting(true)
    try {
      const successfullyCommittedIds = new Set<string>()

      for (const staged of committable) {
        const success = await onCreateConcept(staged.payload)
        if (success) {
          successfullyCommittedIds.add(staged.id)
        }
      }

      setStagedConcepts((previous) =>
        previous.filter((item) => !successfullyCommittedIds.has(item.id)),
      )
    } finally {
      setCommitting(false)
    }
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

  const stagedConceptsWithLabels = stagedConcepts.map((staged) => ({
    ...staged,
    typeName: conceptTypeById.get(staged.payload.concept_type_id)?.name ?? staged.payload.concept_type_id,
    parentName: staged.payload.part_of_concept_id
      ? conceptById.get(staged.payload.part_of_concept_id)?.name ?? staged.payload.part_of_concept_id
      : null,
  }))

  const sortedConceptTypeOptions = [...conceptTypes].sort((left, right) => left.name.localeCompare(right.name))

  const stagedValidation = useMemo(() => {
    const existingKeys = new Set(
      concepts.map((concept) => `${concept.concept_type_id}::${concept.name.trim().toLowerCase()}`),
    )

    const stagedKeyToIds = new Map<string, string[]>()
    const conflictWithExistingIds = new Set<string>()

    for (const staged of stagedConcepts) {
      const key = `${staged.payload.concept_type_id}::${staged.payload.name.trim().toLowerCase()}`
      const ids = stagedKeyToIds.get(key) ?? []
      ids.push(staged.id)
      stagedKeyToIds.set(key, ids)

      if (existingKeys.has(key)) {
        conflictWithExistingIds.add(staged.id)
      }
    }

    const duplicateInQueueIds = new Set<string>()
    for (const ids of stagedKeyToIds.values()) {
      if (ids.length > 1) {
        for (const id of ids) {
          duplicateInQueueIds.add(id)
        }
      }
    }

    const byType = new Map<string, number>()
    let rootCount = 0
    let childCount = 0

    for (const staged of stagedConcepts) {
      const typeName = conceptTypeById.get(staged.payload.concept_type_id)?.name ?? staged.payload.concept_type_id
      byType.set(typeName, (byType.get(typeName) ?? 0) + 1)

      if (staged.payload.part_of_concept_id) {
        childCount += 1
      } else {
        rootCount += 1
      }
    }

    const hasConflicts = conflictWithExistingIds.size > 0 || duplicateInQueueIds.size > 0

    return {
      hasConflicts,
      conflictWithExistingIds,
      duplicateInQueueIds,
      rootCount,
      childCount,
      byType: Array.from(byType.entries()).sort((left, right) => left[0].localeCompare(right[0])),
    }
  }, [conceptTypeById, concepts, stagedConcepts])

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
              setSelectedStartTypeId(event.target.value)
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
