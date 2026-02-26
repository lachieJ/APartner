import type { ConceptTypeRecord } from '../csv/types'

export type ConceptTypeUsage = {
  usedAsPartOfBy: ConceptTypeRecord[]
  usedAsReferenceToBy: ConceptTypeRecord[]
}

const EMPTY_USAGE: ConceptTypeUsage = {
  usedAsPartOfBy: [],
  usedAsReferenceToBy: [],
}

export const getConceptTypeUsage = (
  usageByConceptId: Map<string, ConceptTypeUsage>,
  conceptTypeId: string,
): ConceptTypeUsage => usageByConceptId.get(conceptTypeId) ?? EMPTY_USAGE

export const getCopyIdKey = (conceptTypeId: string) => `id:${conceptTypeId}`

export const getCopyNameKey = (conceptTypeId: string) => `name:${conceptTypeId}`
