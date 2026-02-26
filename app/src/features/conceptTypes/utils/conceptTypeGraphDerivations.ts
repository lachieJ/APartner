import type { ConceptTypeRecord } from '../csv/types'
import type { ConceptTypeIssueSummary } from '../types/issues'
import type { ConceptTypeUsage } from './conceptTypeRowHelpers'

export const getRootOptions = (conceptTypes: ConceptTypeRecord[], topLevelRootsOnly: boolean) => {
  if (!topLevelRootsOnly) {
    return conceptTypes
  }

  return conceptTypes.filter((conceptType) => !conceptType.part_of_concept_type_id)
}

export const buildConceptById = (conceptTypes: ConceptTypeRecord[]) => {
  return new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType]))
}

export const buildInboundUsageByConceptId = (conceptTypes: ConceptTypeRecord[]) => {
  const usageMap = new Map<string, ConceptTypeUsage>()

  for (const conceptType of conceptTypes) {
    usageMap.set(conceptType.id, {
      usedAsPartOfBy: [],
      usedAsReferenceToBy: [],
    })
  }

  for (const conceptType of conceptTypes) {
    if (conceptType.part_of_concept_type_id) {
      usageMap.get(conceptType.part_of_concept_type_id)?.usedAsPartOfBy.push(conceptType)
    }

    if (conceptType.reference_to_concept_type_id) {
      usageMap.get(conceptType.reference_to_concept_type_id)?.usedAsReferenceToBy.push(conceptType)
    }
  }

  for (const usage of usageMap.values()) {
    usage.usedAsPartOfBy.sort((left, right) => left.name.localeCompare(right.name))
    usage.usedAsReferenceToBy.sort((left, right) => left.name.localeCompare(right.name))
  }

  return usageMap
}

export const buildChildrenByParentId = (conceptTypes: ConceptTypeRecord[]) => {
  const childrenMap = new Map<string, ConceptTypeRecord[]>()

  for (const conceptType of conceptTypes) {
    if (!conceptType.part_of_concept_type_id) continue

    const children = childrenMap.get(conceptType.part_of_concept_type_id) ?? []
    children.push(conceptType)
    childrenMap.set(conceptType.part_of_concept_type_id, children)
  }

  for (const children of childrenMap.values()) {
    children.sort((left, right) => {
      const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }

      return left.name.localeCompare(right.name)
    })
  }

  return childrenMap
}

export const buildIssueSummary = (
  conceptTypes: ConceptTypeRecord[],
  conceptById: Map<string, ConceptTypeRecord>,
  childrenByParentId: Map<string, ConceptTypeRecord[]>,
): ConceptTypeIssueSummary => {
  const orphanPartOf: ConceptTypeRecord[] = []
  const brokenReferenceTo: ConceptTypeRecord[] = []
  const siblingOrderIssueParents: { parentId: string; parentName: string; issueCount: number }[] = []

  for (const conceptType of conceptTypes) {
    if (conceptType.part_of_concept_type_id && !conceptById.has(conceptType.part_of_concept_type_id)) {
      orphanPartOf.push(conceptType)
    }

    if (conceptType.reference_to_concept_type_id && !conceptById.has(conceptType.reference_to_concept_type_id)) {
      brokenReferenceTo.push(conceptType)
    }
  }

  for (const [parentId, children] of childrenByParentId.entries()) {
    if (children.length === 0) {
      continue
    }

    let issueCount = 0
    const sorted = [...children].sort((left, right) => {
      const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }

      return left.name.localeCompare(right.name)
    })

    const seenOrders = new Set<number>()
    for (let index = 0; index < sorted.length; index += 1) {
      const child = sorted[index]
      const expectedOrder = index + 1
      const actualOrder = child.part_order

      if (actualOrder === null || actualOrder !== expectedOrder) {
        issueCount += 1
      }

      if (actualOrder !== null) {
        if (seenOrders.has(actualOrder)) {
          issueCount += 1
        }
        seenOrders.add(actualOrder)
      }
    }

    if (issueCount > 0) {
      siblingOrderIssueParents.push({
        parentId,
        parentName: conceptById.get(parentId)?.name ?? parentId,
        issueCount,
      })
    }
  }

  siblingOrderIssueParents.sort((left, right) => left.parentName.localeCompare(right.parentName))

  return {
    orphanPartOf,
    brokenReferenceTo,
    siblingOrderIssueParents,
    totalIssueCount: orphanPartOf.length + brokenReferenceTo.length + siblingOrderIssueParents.length,
  }
}

export const getAffectedConceptTypeIds = (
  issueSummary: ConceptTypeIssueSummary,
  childrenByParentId: Map<string, ConceptTypeRecord[]>,
) => {
  const ids = new Set<string>()

  for (const item of issueSummary.orphanPartOf) {
    ids.add(item.id)
  }

  for (const item of issueSummary.brokenReferenceTo) {
    ids.add(item.id)
  }

  for (const parentIssue of issueSummary.siblingOrderIssueParents) {
    const children = childrenByParentId.get(parentIssue.parentId) ?? []
    for (const child of children) {
      ids.add(child.id)
    }
  }

  return ids
}

export const getDisplayedConceptTypes = (
  conceptTypes: ConceptTypeRecord[],
  affectedConceptTypeIds: Set<string>,
  showIssuesOnly: boolean,
) => {
  if (!showIssuesOnly) {
    return conceptTypes
  }

  return conceptTypes.filter((conceptType) => affectedConceptTypeIds.has(conceptType.id))
}
