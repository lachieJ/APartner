import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  clearConceptLinksBulk,
  clearConceptPartOfLink,
  clearConceptPartOfLinksBulk,
  clearConceptReferenceToLink,
  clearConceptReferenceToLinksBulk,
  createConcept,
  deleteConcept,
  insertConceptRemediationAudit,
  listConcepts,
  updateConceptPartOrder,
  updateConcept,
} from '../data/conceptService'
import type { ConceptPayload, ConceptRecord } from '../types'

type UseConceptsParams = {
  isAuthenticated: boolean
}

export function useConcepts({ isAuthenticated }: UseConceptsParams) {
  const [concepts, setConcepts] = useState<ConceptRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [conceptTypeId, setConceptTypeId] = useState('')
  const [partOfConceptId, setPartOfConceptId] = useState('')
  const [partOrder, setPartOrder] = useState('')
  const [referenceToConceptId, setReferenceToConceptId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [movingConceptId, setMovingConceptId] = useState<string | null>(null)
  const [normalizingSiblingOrders, setNormalizingSiblingOrders] = useState(false)

  const resetForm = useCallback(() => {
    setEditingId(null)
    setName('')
    setDescription('')
    setConceptTypeId('')
    setPartOfConceptId('')
    setPartOrder('')
    setReferenceToConceptId('')
  }, [])

  const reloadConcepts = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await listConcepts()
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setConcepts(result.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setConcepts([])
      resetForm()
      return
    }

    void reloadConcepts()
  }, [isAuthenticated, reloadConcepts, resetForm])

  const conceptOptions = useMemo(
    () =>
      concepts.map((concept) => ({
        id: concept.id,
        name: concept.name,
        conceptTypeId: concept.concept_type_id,
      })),
    [concepts],
  )

  const submitConcept = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setError(null)

    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    if (!conceptTypeId) {
      setError('ConceptType is required.')
      return
    }

    if (partOfConceptId) {
      const parsedOrder = Number.parseInt(partOrder || '1', 10)
      if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
        setError('Order within parent must be a whole number greater than 0.')
        return
      }
    }

    const payload: ConceptPayload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      concept_type_id: conceptTypeId,
      part_of_concept_id: partOfConceptId || null,
      part_order: partOfConceptId ? Number.parseInt(partOrder || '1', 10) : null,
      reference_to_concept_id: referenceToConceptId || null,
    }

    setSubmitting(true)
    try {
      const submitError = editingId
        ? await updateConcept(editingId, payload)
        : await createConcept(payload)

      if (submitError) {
        setError(submitError)
        return
      }

      setMessage(editingId ? 'Concept updated.' : 'Concept created.')
      resetForm()
      await reloadConcepts()
    } finally {
      setSubmitting(false)
    }
  }

  const createConceptFromPayload = async (payload: ConceptPayload, successMessage?: string) => {
    setMessage(null)
    setError(null)

    const createError = await createConcept(payload)
    if (createError) {
      setError(createError)
      return false
    }

    setMessage(successMessage ?? 'Concept created.')
    await reloadConcepts()
    return true
  }

  const editConcept = (concept: ConceptRecord) => {
    setMessage(null)
    setError(null)
    setEditingId(concept.id)
    setName(concept.name)
    setDescription(concept.description ?? '')
    setConceptTypeId(concept.concept_type_id)
    setPartOfConceptId(concept.part_of_concept_id ?? '')
    setPartOrder(concept.part_order !== null ? String(concept.part_order) : '')
    setReferenceToConceptId(concept.reference_to_concept_id ?? '')
  }

  const moveConceptWithinParent = async (id: string, direction: 'up' | 'down') => {
    setMessage(null)
    setError(null)

    const concept = concepts.find((item) => item.id === id)
    if (!concept || !concept.part_of_concept_id) {
      return
    }

    const siblings = concepts
      .filter((item) => item.part_of_concept_id === concept.part_of_concept_id)
      .sort((left, right) => {
        const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
        const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder
        }

        return left.name.localeCompare(right.name)
      })

    const currentIndex = siblings.findIndex((item) => item.id === id)
    if (currentIndex < 0) {
      return
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      return
    }

    const reorderedSiblings = [...siblings]
    const [movedSibling] = reorderedSiblings.splice(currentIndex, 1)
    reorderedSiblings.splice(swapIndex, 0, movedSibling)

    setMovingConceptId(id)
    try {
      for (let index = 0; index < reorderedSiblings.length; index += 1) {
        const sibling = reorderedSiblings[index]
        const nextOrder = index + 1
        if (sibling.part_order === nextOrder) {
          continue
        }

        const updateError = await updateConceptPartOrder(sibling.id, nextOrder)
        if (updateError) {
          setError(updateError)
          return
        }
      }

      setMessage(`Moved '${concept.name}' ${direction}.`)
      await reloadConcepts()
    } finally {
      setMovingConceptId(null)
    }
  }

  const normalizeConceptSiblingOrders = async () => {
    setMessage(null)
    setError(null)

    const siblingsByParentId = new Map<string, ConceptRecord[]>()

    for (const concept of concepts) {
      if (!concept.part_of_concept_id) {
        continue
      }

      const siblings = siblingsByParentId.get(concept.part_of_concept_id) ?? []
      siblings.push(concept)
      siblingsByParentId.set(concept.part_of_concept_id, siblings)
    }

    if (siblingsByParentId.size === 0) {
      setMessage('No concept sibling groups found to normalize.')
      return
    }

    let updatedCount = 0

    setNormalizingSiblingOrders(true)
    try {
      for (const siblings of siblingsByParentId.values()) {
        const sortedSiblings = [...siblings].sort((left, right) => {
          const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
          const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder
          }

          return left.name.localeCompare(right.name)
        })

        for (let index = 0; index < sortedSiblings.length; index += 1) {
          const sibling = sortedSiblings[index]
          const normalizedOrder = index + 1

          if (sibling.part_order === normalizedOrder) {
            continue
          }

          const updateError = await updateConceptPartOrder(sibling.id, normalizedOrder)
          if (updateError) {
            setError(updateError)
            return
          }

          updatedCount += 1
        }
      }

      if (updatedCount === 0) {
        setMessage('Concept sibling orders are already normalized.')
      } else {
        setMessage(`Normalized concept sibling order for ${updatedCount} concept(s).`)
      }

      await reloadConcepts()
    } finally {
      setNormalizingSiblingOrders(false)
    }
  }

  const removeConcept = async (id: string) => {
    setMessage(null)
    setError(null)

    const deleteError = await deleteConcept(id)
    if (deleteError) {
      setError(deleteError)
      return
    }

    if (editingId === id) {
      resetForm()
    }

    setMessage('Concept deleted.')
    await reloadConcepts()
  }

  const recordRemediationAudit = async (
    actionKind: string,
    partOfIds: string[],
    referenceToIds: string[],
    reason: string | null,
  ) => {
    const affectedConceptIds = Array.from(new Set([...partOfIds, ...referenceToIds]))
    const auditError = await insertConceptRemediationAudit({
      actionKind,
      reason,
      partOfClearedCount: partOfIds.length,
      referenceToClearedCount: referenceToIds.length,
      affectedConceptIds,
    })

    if (auditError) {
      setError(`Remediation applied, but audit logging failed: ${auditError}`)
    }
  }

  const clearPartOfForConcept = async (id: string) => {
    setMessage(null)
    setError(null)

    const updateError = await clearConceptPartOfLink(id)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage('Cleared PartOf link.')
    await recordRemediationAudit('clear-partof-single', [id], [], 'Single PartOf link cleared from diagnostics.')
    await reloadConcepts()
  }

  const clearReferenceToForConcept = async (id: string) => {
    setMessage(null)
    setError(null)

    const updateError = await clearConceptReferenceToLink(id)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage('Cleared ReferenceTo link.')
    await recordRemediationAudit(
      'clear-referenceto-single',
      [],
      [id],
      'Single ReferenceTo link cleared from diagnostics.',
    )
    await reloadConcepts()
  }

  const clearPartOfForConceptsBulk = async (ids: string[]) => {
    setMessage(null)
    setError(null)

    const updateError = await clearConceptPartOfLinksBulk(ids)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage(`Cleared PartOf links for ${ids.length} concept(s).`)
    await recordRemediationAudit('clear-partof-bulk', ids, [], 'Bulk PartOf link clear from diagnostics.')
    await reloadConcepts()
  }

  const clearReferenceToForConceptsBulk = async (ids: string[]) => {
    setMessage(null)
    setError(null)

    const updateError = await clearConceptReferenceToLinksBulk(ids)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage(`Cleared ReferenceTo links for ${ids.length} concept(s).`)
    await recordRemediationAudit('clear-referenceto-bulk', [], ids, 'Bulk ReferenceTo link clear from diagnostics.')
    await reloadConcepts()
  }

  const runSafeAutoFix = async (partOfIds: string[], referenceToIds: string[], reason?: string) => {
    setMessage(null)
    setError(null)

    const uniquePartOfIds = Array.from(new Set(partOfIds))
    const uniqueReferenceToIds = Array.from(new Set(referenceToIds))

    if (uniquePartOfIds.length === 0 && uniqueReferenceToIds.length === 0) {
      setMessage('No safe auto-fix actions were required.')
      return
    }

    const updateError = await clearConceptLinksBulk(uniquePartOfIds, uniqueReferenceToIds)
    if (updateError) {
      setError(updateError)
      return
    }

    setMessage(
      `Safe auto-fix applied. Cleared PartOf: ${uniquePartOfIds.length}, Cleared ReferenceTo: ${uniqueReferenceToIds.length}.`,
    )
    await recordRemediationAudit(
      'safe-auto-fix',
      uniquePartOfIds,
      uniqueReferenceToIds,
      reason?.trim() ? reason.trim() : 'Safe auto-fix from diagnostics.',
    )
    await reloadConcepts()
  }

  return {
    concepts,
    conceptOptions,
    reloadConcepts,
    loading,
    submitting,
    editingId,
    name,
    description,
    conceptTypeId,
    partOfConceptId,
    partOrder,
    referenceToConceptId,
    message,
    error,
    movingConceptId,
    normalizingSiblingOrders,
    setName,
    setDescription,
    setConceptTypeId,
    setPartOfConceptId,
    setPartOrder,
    setReferenceToConceptId,
    setError,
    setMessage,
    createConceptFromPayload,
    submitConcept,
    editConcept,
    removeConcept,
    clearPartOfForConcept,
    clearReferenceToForConcept,
    clearPartOfForConceptsBulk,
    clearReferenceToForConceptsBulk,
    runSafeAutoFix,
    moveConceptWithinParent,
    normalizeConceptSiblingOrders,
    resetForm,
  }
}
