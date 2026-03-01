import { normalizeConceptLookupValue } from './conceptNormalization'

export function getConceptTypeAndNameKey(conceptTypeId: string, conceptName: string): string {
  return `${conceptTypeId}::${normalizeConceptLookupValue(conceptName)}`
}
