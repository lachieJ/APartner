import { useCallback, useState } from 'react'
import type { ConceptRecord } from '../types'

export function useConceptFormState() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [conceptTypeId, setConceptTypeId] = useState('')
  const [partOfConceptId, setPartOfConceptId] = useState('')
  const [partOrder, setPartOrder] = useState('')
  const [referenceToConceptId, setReferenceToConceptId] = useState('')

  const resetForm = useCallback(() => {
    setEditingId(null)
    setName('')
    setDescription('')
    setConceptTypeId('')
    setPartOfConceptId('')
    setPartOrder('')
    setReferenceToConceptId('')
  }, [])

  const populateFromConcept = (concept: ConceptRecord) => {
    setEditingId(concept.id)
    setName(concept.name)
    setDescription(concept.description ?? '')
    setConceptTypeId(concept.concept_type_id)
    setPartOfConceptId(concept.part_of_concept_id ?? '')
    setPartOrder(concept.part_order !== null ? String(concept.part_order) : '')
    setReferenceToConceptId(concept.reference_to_concept_id ?? '')
  }

  return {
    editingId,
    name,
    description,
    conceptTypeId,
    partOfConceptId,
    partOrder,
    referenceToConceptId,
    setName,
    setDescription,
    setConceptTypeId,
    setPartOfConceptId,
    setPartOrder,
    setReferenceToConceptId,
    resetForm,
    populateFromConcept,
  }
}