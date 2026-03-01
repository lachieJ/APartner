import { useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import { buildConceptIssueSummary, getAffectedConceptIds } from '../utils/conceptDiagnostics'
import {
  buildChildrenByParentId,
  buildConceptById,
  getConceptTypeById,
  getConceptTypeNameById,
  getDisplayedConcepts,
  getRootConcepts,
} from '../utils/conceptModelViewDerivations'
import type { ConceptRecord } from '../types'

type UseConceptModelViewStateParams = {
  concepts: ConceptRecord[]
  conceptTypes: ConceptTypeRecord[]
}

export type ConceptModelViewMode = 'flat' | 'tree' | 'compact'

export function useConceptModelViewState({ concepts, conceptTypes }: UseConceptModelViewStateParams) {
  const [viewMode, setViewMode] = useState<ConceptModelViewMode>('flat')
  const [showIssuesOnly, setShowIssuesOnly] = useState(false)

  const conceptTypeById = useMemo(() => getConceptTypeById(conceptTypes), [conceptTypes])
  const conceptById = useMemo(() => buildConceptById(concepts), [concepts])
  const issueSummary = useMemo(() => buildConceptIssueSummary(concepts, conceptTypes), [concepts, conceptTypes])
  const affectedConceptIds = useMemo(() => getAffectedConceptIds(issueSummary), [issueSummary])

  const displayedConcepts = useMemo(
    () => getDisplayedConcepts(concepts, affectedConceptIds, showIssuesOnly),
    [affectedConceptIds, concepts, showIssuesOnly],
  )

  const conceptTypeNameById = useMemo(() => getConceptTypeNameById(conceptTypes), [conceptTypes])

  const childrenByParentId = useMemo(() => buildChildrenByParentId(displayedConcepts), [displayedConcepts])

  const rootConcepts = useMemo(() => getRootConcepts(displayedConcepts, conceptById), [conceptById, displayedConcepts])

  return {
    viewMode,
    setViewMode,
    showIssuesOnly,
    setShowIssuesOnly,
    conceptTypeById,
    conceptById,
    issueSummary,
    displayedConcepts,
    conceptTypeNameById,
    childrenByParentId,
    rootConcepts,
  }
}