export type ConceptImportRow = {
  rowNumber: number
  name: string
  description: string | null
  conceptTypeName: string
  partOfName: string | null
  partOrder: number | null
  referenceToName: string | null
}

export type ConceptImportFailure = {
  rowNumber: number
  name: string
  conceptTypeName: string
  partOfName: string | null
  partOrder: number | null
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
