import { useMemo } from 'react'
import type { ConceptTypeRecord } from '../csv/types'
import {
  buildChildrenByParentId,
  buildConceptById,
  buildInboundUsageByConceptId,
  buildIssueSummary,
  getAffectedConceptTypeIds,
  getDisplayedConceptTypes,
  getRootOptions,
} from '../utils/conceptTypeGraphDerivations'

type UseConceptTypeGraphStateParams = {
  conceptTypes: ConceptTypeRecord[]
  topLevelRootsOnly: boolean
  showIssuesOnly: boolean
}

export function useConceptTypeGraphState({
  conceptTypes,
  topLevelRootsOnly,
  showIssuesOnly,
}: UseConceptTypeGraphStateParams) {
  const rootOptions = useMemo(() => getRootOptions(conceptTypes, topLevelRootsOnly), [conceptTypes, topLevelRootsOnly])

  const conceptById = useMemo(() => buildConceptById(conceptTypes), [conceptTypes])

  const inboundUsageByConceptId = useMemo(() => buildInboundUsageByConceptId(conceptTypes), [conceptTypes])

  const childrenByParentId = useMemo(() => buildChildrenByParentId(conceptTypes), [conceptTypes])

  const issueSummary = useMemo(
    () => buildIssueSummary(conceptTypes, conceptById, childrenByParentId),
    [childrenByParentId, conceptById, conceptTypes],
  )

  const affectedConceptTypeIds = useMemo(
    () => getAffectedConceptTypeIds(issueSummary, childrenByParentId),
    [childrenByParentId, issueSummary],
  )

  const displayedConceptTypes = useMemo(
    () => getDisplayedConceptTypes(conceptTypes, affectedConceptTypeIds, showIssuesOnly),
    [affectedConceptTypeIds, conceptTypes, showIssuesOnly],
  )

  return {
    rootOptions,
    conceptById,
    inboundUsageByConceptId,
    childrenByParentId,
    issueSummary,
    displayedConceptTypes,
  }
}
