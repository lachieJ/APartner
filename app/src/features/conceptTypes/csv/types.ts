export type ConceptTypeRecord = {
  id: string
  name: string
  description: string | null
  part_of_concept_type_id: string | null
  part_order: number | null
  reference_to_concept_type_id: string | null
  created_at: string
  updated_at: string
}

export type ImportRow = {
  rowNumber: number
  name: string
  description: string | null
  partOfName: string | null
  partOrder: number | null
  referenceToName: string | null
}

export type ImportFailure = {
  rowNumber: number
  name: string
  description: string | null
  partOfName: string | null
  partOrder: number | null
  referenceToName: string | null
  error: string
}

export type ImportSummary = {
  total: number
  created: number
  updated: number
  failed: number
  failures: ImportFailure[]
}

export type ImportPreviewSummary = {
  total: number
  toCreate: number
  toUpdate: number
  unchanged: number
}
