import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import type { ConceptRecord } from '../types'
import { groupSiblingsByParent, orderSiblings } from '../../shared/utils/siblingOrdering'

export const buildConceptById = (concepts: ConceptRecord[]) => {
  return new Map(concepts.map((concept) => [concept.id, concept]))
}

export const getConceptTypeById = (conceptTypes: ConceptTypeRecord[]) => {
  return new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType]))
}

export const getConceptTypeNameById = (conceptTypes: ConceptTypeRecord[]) => {
  return new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType.name]))
}

export const getDisplayedConcepts = (
  concepts: ConceptRecord[],
  affectedConceptIds: Set<string>,
  showIssuesOnly: boolean,
) => {
  if (!showIssuesOnly) {
    return concepts
  }

  return concepts.filter((concept) => affectedConceptIds.has(concept.id))
}

export const buildChildrenByParentId = (displayedConcepts: ConceptRecord[]) => {
  return groupSiblingsByParent(displayedConcepts, (concept) => concept.part_of_concept_id)
}

export const getRootConcepts = (displayedConcepts: ConceptRecord[], conceptById: Map<string, ConceptRecord>) => {
  return orderSiblings(
    displayedConcepts.filter((concept) => !concept.part_of_concept_id || !conceptById.has(concept.part_of_concept_id)),
  )
}