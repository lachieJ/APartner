import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import type { ConceptIssueSummary } from '../types/issues'

export const buildConceptById = (concepts: ConceptRecord[]) => {
  return new Map(concepts.map((concept) => [concept.id, concept]))
}

export const getConceptTypeById = (conceptTypes: ConceptTypeRecord[]) => {
  return new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType]))
}

export const detectPartOfCycles = (concepts: ConceptRecord[]) => {
  const conceptById = buildConceptById(concepts)
  const cycleIds = new Set<string>()

  for (const concept of concepts) {
    const seen = new Set<string>()
    let currentId: string | null = concept.id

    while (currentId) {
      if (seen.has(currentId)) {
        for (const seenId of seen) {
          cycleIds.add(seenId)
        }
        break
      }

      seen.add(currentId)
      const current = conceptById.get(currentId)
      currentId = current?.part_of_concept_id ?? null
    }
  }

  return cycleIds
}

export const buildConceptIssueSummary = (
  concepts: ConceptRecord[],
  conceptTypes: ConceptTypeRecord[],
): ConceptIssueSummary => {
  const conceptById = buildConceptById(concepts)
  const conceptTypeById = getConceptTypeById(conceptTypes)

  const orphanPartOf: ConceptRecord[] = []
  const brokenReferenceTo: ConceptRecord[] = []
  const invalidPartOfType: ConceptRecord[] = []
  const invalidReferenceToType: ConceptRecord[] = []

  for (const concept of concepts) {
    const sourceType = conceptTypeById.get(concept.concept_type_id)

    if (concept.part_of_concept_id) {
      const parent = conceptById.get(concept.part_of_concept_id)
      if (!parent) {
        orphanPartOf.push(concept)
      } else if (sourceType?.part_of_concept_type_id && parent.concept_type_id !== sourceType.part_of_concept_type_id) {
        invalidPartOfType.push(concept)
      }
    }

    if (concept.reference_to_concept_id) {
      const reference = conceptById.get(concept.reference_to_concept_id)
      if (!reference) {
        brokenReferenceTo.push(concept)
      } else if (
        sourceType?.reference_to_concept_type_id &&
        reference.concept_type_id !== sourceType.reference_to_concept_type_id
      ) {
        invalidReferenceToType.push(concept)
      }
    }
  }

  const partOfCycleIds = detectPartOfCycles(concepts)
  const partOfCycleNodes = concepts.filter((concept) => partOfCycleIds.has(concept.id))

  const uniqueIssueIds = new Set<string>()
  for (const item of [...orphanPartOf, ...brokenReferenceTo, ...invalidPartOfType, ...invalidReferenceToType, ...partOfCycleNodes]) {
    uniqueIssueIds.add(item.id)
  }

  return {
    orphanPartOf,
    brokenReferenceTo,
    invalidPartOfType,
    invalidReferenceToType,
    partOfCycleNodes,
    totalIssueCount: uniqueIssueIds.size,
  }
}

export const getAffectedConceptIds = (summary: ConceptIssueSummary) => {
  const ids = new Set<string>()

  for (const item of summary.orphanPartOf) ids.add(item.id)
  for (const item of summary.brokenReferenceTo) ids.add(item.id)
  for (const item of summary.invalidPartOfType) ids.add(item.id)
  for (const item of summary.invalidReferenceToType) ids.add(item.id)
  for (const item of summary.partOfCycleNodes) ids.add(item.id)

  return ids
}
