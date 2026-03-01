import { useEffect } from 'react'
import type { ConceptPayload, ConceptRecord } from '../types'
import type { CompactPendingRootSelection, CompactRootCreateDraft } from '../types/compactMaintenance'
import { isRootConcept, normalizeConceptLookupValue } from '../utils/conceptConventions'

type UseConceptCompactRootSelectionParams = {
  concepts: ConceptRecord[]
  selectedRootTypeId: string
  rootCreateDraft: CompactRootCreateDraft
  pendingRootSelection: CompactPendingRootSelection | null
  setPendingRootSelection: (value: CompactPendingRootSelection | null) => void
  setRootCreateDraft: (
    value: CompactRootCreateDraft | ((previous: CompactRootCreateDraft) => CompactRootCreateDraft),
  ) => void
  setSelectedRootTypeId: (value: string) => void
  setSelectedRootConceptId: (value: string) => void
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
}

export function useConceptCompactRootSelection({
  concepts,
  selectedRootTypeId,
  rootCreateDraft,
  pendingRootSelection,
  setPendingRootSelection,
  setRootCreateDraft,
  setSelectedRootTypeId,
  setSelectedRootConceptId,
  onCreateConcept,
}: UseConceptCompactRootSelectionParams) {
  const handleAddRootInstance = async () => {
    if (!selectedRootTypeId) {
      return
    }

    const nextName = rootCreateDraft.name.trim()
    if (!nextName) {
      return
    }

    const success = await onCreateConcept({
      name: nextName,
      description: rootCreateDraft.description.trim() ? rootCreateDraft.description.trim() : null,
      concept_type_id: selectedRootTypeId,
      part_of_concept_id: null,
      part_order: null,
      reference_to_concept_id: null,
    })

    if (success) {
      setPendingRootSelection({ conceptTypeId: selectedRootTypeId, name: nextName })
      setRootCreateDraft({ name: '', description: '' })
    }
  }

  useEffect(() => {
    if (!pendingRootSelection) {
      return
    }

    const matched = concepts.find(
      (concept) =>
        concept.concept_type_id === pendingRootSelection.conceptTypeId &&
        isRootConcept(concept) &&
        normalizeConceptLookupValue(concept.name) === normalizeConceptLookupValue(pendingRootSelection.name),
    )

    if (matched) {
      setSelectedRootTypeId(pendingRootSelection.conceptTypeId)
      setSelectedRootConceptId(matched.id)
      setPendingRootSelection(null)
    }
  }, [
    concepts,
    pendingRootSelection,
    setPendingRootSelection,
    setSelectedRootConceptId,
    setSelectedRootTypeId,
  ])

  return {
    handleAddRootInstance,
  }
}
