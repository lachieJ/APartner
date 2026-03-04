export type ConceptImportRow = {
  rowNumber: number
  conceptId: string | null
  name: string
  description: string | null
  conceptTypeName: string
  rootConceptId: string | null
  rootConceptName: string | null
  partOfConceptId: string | null
  partOfName: string | null
  partOrder: number | null
  referenceToConceptId: string | null
  referenceToName: string | null
}

export type ConceptImportFailure = {
  rowNumber: number
  conceptId: string | null
  name: string
  conceptTypeName: string
  rootConceptId: string | null
  rootConceptName: string | null
  partOfConceptId: string | null
  partOfName: string | null
  partOrder: number | null
  referenceToConceptId: string | null
  referenceToName: string | null
  error: string
}

export type ConceptImportSummary = {
  total: number
  created: number
  updated: number
  failed: number
  failures: ConceptImportFailure[]
}
