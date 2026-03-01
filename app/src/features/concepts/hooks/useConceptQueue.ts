import { type ChangeEvent, useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptPayload, ConceptRecord } from '../types'
import { getConceptTypeAndNameKey } from '../utils/conceptConventions'

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

type UseConceptQueueParams = {
  concepts: ConceptRecord[]
  conceptTypeById: Map<string, ConceptTypeRecord>
  conceptById: Map<string, ConceptRecord>
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
}

const createStagedConceptFromPayload = (payload: ConceptPayload): StagedConcept => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  payload,
})

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
    typeof legacy.conceptTypeId === 'string'
      ? legacy.conceptTypeId.trim()
      : typeof legacy.concept_type_id === 'string'
        ? legacy.concept_type_id.trim()
        : ''

  if (!name || !conceptTypeId) {
    return null
  }

  const description = typeof legacy.description === 'string' ? legacy.description : null

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
    return {
      items: snapshot.items,
      sourceFormat: 'concept-queue-v1',
      normalizedTo: 'concept-queue-v1',
      migrationMessage: null,
    }
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

export function useConceptQueue({
  concepts,
  conceptTypeById,
  conceptById,
  onCreateConcept,
}: UseConceptQueueParams) {
  const [stagedConcepts, setStagedConcepts] = useState<StagedConcept[]>([])
  const [committing, setCommitting] = useState(false)
  const [queueStatus, setQueueStatus] = useState<string | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [queueImportReport, setQueueImportReport] = useState<QueueImportReport | null>(null)

  const clearQueueMessages = () => {
    setQueueStatus(null)
    setQueueError(null)
    setQueueImportReport(null)
  }

  const stagedValidation = useMemo(() => {
    const existingKeys = new Set(concepts.map((concept) => getConceptTypeAndNameKey(concept.concept_type_id, concept.name)))

    const stagedKeyToIds = new Map<string, string[]>()
    const conflictWithExistingIds = new Set<string>()

    for (const staged of stagedConcepts) {
      const key = getConceptTypeAndNameKey(staged.payload.concept_type_id, staged.payload.name)
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

  const stagedConceptsWithLabels = stagedConcepts.map((staged) => ({
    ...staged,
    typeName: conceptTypeById.get(staged.payload.concept_type_id)?.name ?? staged.payload.concept_type_id,
    parentName: staged.payload.part_of_concept_id
      ? conceptById.get(staged.payload.part_of_concept_id)?.name ?? staged.payload.part_of_concept_id
      : null,
  }))

  const stageConcept = (payload: ConceptPayload) => {
    clearQueueMessages()
    setStagedConcepts((previous) => [...previous, createStagedConceptFromPayload(payload)])
  }

  const removeStagedConcept = (id: string) => {
    clearQueueMessages()
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
    clearQueueMessages()
    setStagedConcepts((previous) =>
      previous.filter(
        (item) =>
          !stagedValidation.conflictWithExistingIds.has(item.id) &&
          !stagedValidation.duplicateInQueueIds.has(item.id),
      ),
    )
  }

  const clearAllStagedConcepts = () => {
    clearQueueMessages()
    setStagedConcepts([])
  }

  const exportQueueAsJson = () => {
    clearQueueMessages()

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

  const importQueueFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    clearQueueMessages()

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

      setStagedConcepts((previous) => previous.filter((item) => !successfullyCommittedIds.has(item.id)))
    } finally {
      setCommitting(false)
    }
  }

  return {
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
  }
}
