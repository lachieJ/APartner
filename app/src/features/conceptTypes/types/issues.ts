import type { ConceptTypeRecord } from '../csv/types'

export type ConceptTypeIssueSummary = {
  orphanPartOf: ConceptTypeRecord[]
  brokenReferenceTo: ConceptTypeRecord[]
  siblingOrderIssueParents: { parentId: string; parentName: string; issueCount: number }[]
  totalIssueCount: number
}
