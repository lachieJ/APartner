import type { ConceptRecord } from '../types'

export type ConceptIssueSummary = {
  orphanPartOf: ConceptRecord[]
  brokenReferenceTo: ConceptRecord[]
  invalidPartOfType: ConceptRecord[]
  invalidReferenceToType: ConceptRecord[]
  partOfCycleNodes: ConceptRecord[]
  totalIssueCount: number
}
