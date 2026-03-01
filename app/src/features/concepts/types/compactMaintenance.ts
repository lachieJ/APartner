import type { ConceptRecord } from '../types'

export type CompactRootCreateDraft = {
  name: string
  description: string
}

export type CompactConceptDraft = {
  name: string
  description: string
  referenceToConceptId: string
}

export type CompactQuickReferenceCreateDraft = {
  name: string
  description: string
  parentConceptId: string
}

export type CompactReferenceCreationOptions = {
  expectedParentTypeId: string | null
  requiresParentSelection: boolean
  parentOptions: ConceptRecord[]
}

export type CompactCreateDraftByParentTypeKey = Record<string, CompactConceptDraft>

export type CompactEditDraftByConceptId = Record<string, CompactConceptDraft>

export type CompactQuickReferenceDraftByKey = Record<string, CompactQuickReferenceCreateDraft>

export type CompactPendingReferenceSelection = {
  referenceConceptTypeId: string
  name: string
}

export type CompactPendingRootSelection = {
  conceptTypeId: string
  name: string
}
