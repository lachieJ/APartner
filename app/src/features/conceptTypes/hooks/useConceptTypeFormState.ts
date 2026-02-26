import { useState } from 'react'
import type { ConceptTypeRecord } from '../csv/types'

export function useConceptTypeFormState() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [partOfConceptTypeId, setPartOfConceptTypeId] = useState('')
  const [partOrder, setPartOrder] = useState('')
  const [referenceToConceptTypeId, setReferenceToConceptTypeId] = useState('')

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setPartOfConceptTypeId('')
    setPartOrder('')
    setReferenceToConceptTypeId('')
  }

  const startEdit = (conceptType: ConceptTypeRecord) => {
    setEditingId(conceptType.id)
    setName(conceptType.name)
    setDescription(conceptType.description ?? '')
    setPartOfConceptTypeId(conceptType.part_of_concept_type_id ?? '')
    setPartOrder(conceptType.part_order ? String(conceptType.part_order) : '')
    setReferenceToConceptTypeId(conceptType.reference_to_concept_type_id ?? '')
  }

  const buildPayload = () => ({
    name: name.trim(),
    description: description.trim() || null,
    part_of_concept_type_id: partOfConceptTypeId || null,
    part_order: partOfConceptTypeId ? Number.parseInt(partOrder || '1', 10) : null,
    reference_to_concept_type_id: referenceToConceptTypeId || null,
  })

  return {
    editingId,
    name,
    description,
    partOfConceptTypeId,
    partOrder,
    referenceToConceptTypeId,
    setName,
    setDescription,
    setPartOfConceptTypeId,
    setPartOrder,
    setReferenceToConceptTypeId,
    setEditingId,
    resetForm,
    startEdit,
    buildPayload,
  }
}
