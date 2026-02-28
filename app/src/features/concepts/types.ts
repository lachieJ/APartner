export type ConceptRecord = {
  id: string
  name: string
  description: string | null
  concept_type_id: string
  part_of_concept_id: string | null
  part_order: number | null
  reference_to_concept_id: string | null
  created_at: string
  updated_at: string
}

export type ConceptPayload = {
  name: string
  description: string | null
  concept_type_id: string
  part_of_concept_id: string | null
  part_order: number | null
  reference_to_concept_id: string | null
}
