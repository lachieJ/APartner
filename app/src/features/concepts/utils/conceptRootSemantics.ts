import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import { orderSiblings } from '../../shared/utils/siblingOrdering'
import type { ConceptRecord } from '../types'

const ROOT_DRAFT_KEY_PREFIX = 'ROOT::'

export function getCompactRootDraftKey(conceptTypeId: string): string {
  return `${ROOT_DRAFT_KEY_PREFIX}${conceptTypeId}`
}

export function isRootOrDecomposableConceptType(conceptType: ConceptTypeRecord): boolean {
  return !conceptType.part_of_concept_type_id || conceptType.part_of_concept_type_id === conceptType.id
}

export function getRootOrDecomposableConceptTypes(conceptTypes: ConceptTypeRecord[]): ConceptTypeRecord[] {
  return orderSiblings(conceptTypes.filter(isRootOrDecomposableConceptType))
}

export function isRootConcept(concept: ConceptRecord): boolean {
  return !concept.part_of_concept_id
}

export function getRootConceptsForType(concepts: ConceptRecord[], conceptTypeId: string): ConceptRecord[] {
  if (!conceptTypeId) {
    return []
  }

  return concepts
    .filter((concept) => concept.concept_type_id === conceptTypeId && isRootConcept(concept))
    .sort((left, right) => {
      const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }

      return left.name.localeCompare(right.name)
    })
}
