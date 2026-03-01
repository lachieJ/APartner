import { useEffect } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptPayload, ConceptRecord } from '../types'
import type {
  CompactCreateDraftByParentTypeKey,
  CompactEditDraftByConceptId,
  CompactPendingReferenceSelection,
  CompactQuickReferenceDraftByKey,
  CompactReferenceCreationOptions,
} from '../types/compactMaintenance'
import {
  getCompactPendingSelectionKeyFromReferencePanelKey,
  normalizeConceptLookupValue,
  parseCompactPendingSelectionKey,
} from '../utils/conceptConventions'

type UseConceptCompactReferencesParams = {
  concepts: ConceptRecord[]
  conceptTypeById: Map<string, ConceptTypeRecord>
  quickReferenceCreateDraftByKey: CompactQuickReferenceDraftByKey
  pendingReferenceSelectionByKey: Record<string, CompactPendingReferenceSelection>
  setPendingReferenceSelectionByKey: React.Dispatch<
    React.SetStateAction<Record<string, CompactPendingReferenceSelection>>
  >
  setCreateDraftByParentTypeKey: React.Dispatch<React.SetStateAction<CompactCreateDraftByParentTypeKey>>
  setEditDraftByConceptId: React.Dispatch<React.SetStateAction<CompactEditDraftByConceptId>>
  clearQuickReferenceCreateDraft: (panelKey: string) => void
  closeQuickReferenceCreatePanel: (panelKey: string) => void
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
}

export function useConceptCompactReferences({
  concepts,
  conceptTypeById,
  quickReferenceCreateDraftByKey,
  pendingReferenceSelectionByKey,
  setPendingReferenceSelectionByKey,
  setCreateDraftByParentTypeKey,
  setEditDraftByConceptId,
  clearQuickReferenceCreateDraft,
  closeQuickReferenceCreatePanel,
  onCreateConcept,
}: UseConceptCompactReferencesParams) {
  const getReferenceCreationParentOptions = (
    referenceConceptTypeId: string,
  ): CompactReferenceCreationOptions => {
    const referenceType = conceptTypeById.get(referenceConceptTypeId)
    const expectedParentTypeId = referenceType?.part_of_concept_type_id ?? null
    const requiresParentSelection = Boolean(expectedParentTypeId && expectedParentTypeId !== referenceConceptTypeId)

    const parentOptions = expectedParentTypeId
      ? concepts
          .filter((concept) => concept.concept_type_id === expectedParentTypeId)
          .sort((left, right) => left.name.localeCompare(right.name))
      : []

    return {
      expectedParentTypeId,
      requiresParentSelection,
      parentOptions,
    }
  }

  const handleCreateReferenceConcept = async (referenceConceptTypeId: string, panelKey: string) => {
    const draft = quickReferenceCreateDraftByKey[panelKey] ?? { name: '', description: '', parentConceptId: '' }
    const nextName = draft.name.trim()
    if (!nextName) {
      return
    }

    const { requiresParentSelection, parentOptions } = getReferenceCreationParentOptions(referenceConceptTypeId)
    const resolvedParentConceptId =
      draft.parentConceptId || (requiresParentSelection && parentOptions.length === 1 ? parentOptions[0].id : '')

    if (requiresParentSelection && !resolvedParentConceptId) {
      return
    }

    const success = await onCreateConcept({
      name: nextName,
      description: draft.description.trim() ? draft.description.trim() : null,
      concept_type_id: referenceConceptTypeId,
      part_of_concept_id: resolvedParentConceptId || null,
      part_order: null,
      reference_to_concept_id: null,
    })

    if (success) {
      const pendingSelectionKey = getCompactPendingSelectionKeyFromReferencePanelKey(panelKey)

      if (pendingSelectionKey) {
        setPendingReferenceSelectionByKey((previous) => ({
          ...previous,
          [pendingSelectionKey]: {
            referenceConceptTypeId,
            name: nextName,
          },
        }))
      }

      clearQuickReferenceCreateDraft(panelKey)
      closeQuickReferenceCreatePanel(panelKey)
    }
  }

  useEffect(() => {
    const pendingEntries = Object.entries(pendingReferenceSelectionByKey)
    if (pendingEntries.length === 0) {
      return
    }

    let didResolveAny = false

    const resolvedKeys = new Set<string>()

    for (const [pendingKey, pending] of pendingEntries) {
      const matchedReference = concepts.find(
        (concept) =>
          concept.concept_type_id === pending.referenceConceptTypeId &&
          normalizeConceptLookupValue(concept.name) === normalizeConceptLookupValue(pending.name),
      )

      if (!matchedReference) {
        continue
      }

      const pendingScope = parseCompactPendingSelectionKey(pendingKey)
      if (!pendingScope) {
        continue
      }

      if (pendingScope.kind === 'add') {
        const scopedKey = pendingScope.scopedKey
        setCreateDraftByParentTypeKey((previous) => ({
          ...previous,
          [scopedKey]: {
            ...(previous[scopedKey] ?? { name: '', description: '', referenceToConceptId: '' }),
            referenceToConceptId: matchedReference.id,
          },
        }))
      } else {
        const conceptId = pendingScope.conceptId
        setEditDraftByConceptId((previous) => ({
          ...previous,
          [conceptId]: {
            ...(previous[conceptId] ?? { name: '', description: '', referenceToConceptId: '' }),
            referenceToConceptId: matchedReference.id,
          },
        }))
      }

      didResolveAny = true
      resolvedKeys.add(pendingKey)
    }

    if (!didResolveAny) {
      return
    }

    setPendingReferenceSelectionByKey((previous) => {
      const next = { ...previous }
      for (const key of resolvedKeys) {
        delete next[key]
      }
      return next
    })
  }, [
    concepts,
    pendingReferenceSelectionByKey,
    setCreateDraftByParentTypeKey,
    setEditDraftByConceptId,
    setPendingReferenceSelectionByKey,
  ])

  return {
    getReferenceCreationParentOptions,
    handleCreateReferenceConcept,
  }
}
