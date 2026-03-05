import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  createConcept,
  createConceptWithRecord,
  deleteConcept,
  listConcepts,
  updateConcept,
} from '../data/conceptService'
import type { ConceptPayload, ConceptRecord } from '../types'
import { useConceptRemediation } from './useConceptRemediation'
import { useConceptFormState } from './useConceptFormState'
import { useConceptOrderingActions } from './useConceptOrderingActions'

type UseConceptsParams = {
  isAuthenticated: boolean
}

export function useConcepts({ isAuthenticated }: UseConceptsParams) {
  const [concepts, setConcepts] = useState<ConceptRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
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
  } = useConceptFormState()

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

  const {
    movingConceptId,
    normalizingSiblingOrders,
    moveConceptWithinParent,
    normalizeConceptSiblingOrders,
  } = useConceptOrderingActions({
    concepts,
    reloadConcepts,
    setMessage,
    setError,
  })

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
      setError('MetaModel type is required.')
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

  const updateConceptFromPayload = async (id: string, payload: ConceptPayload, successMessage?: string) => {
    setMessage(null)
    setError(null)

    const updateError = await updateConcept(id, payload)
    if (updateError) {
      setError(updateError)
      return false
    }

    setMessage(successMessage ?? 'Concept updated.')
    await reloadConcepts()
    return true
  }

  const editConcept = (concept: ConceptRecord) => {
    setMessage(null)
    setError(null)
    populateFromConcept(concept)
  }

  const {
    clearPartOfForConcept,
    clearReferenceToForConcept,
    clearPartOfForConceptsBulk,
    clearReferenceToForConceptsBulk,
    runSafeAutoFix,
  } = useConceptRemediation({
    reloadConcepts,
    setMessage,
    setError,
  })

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

  const copyConceptModelFromRoot = async (rootConceptId: string) => {
    setMessage(null)
    setError(null)

    const sourceRoot = concepts.find((concept) => concept.id === rootConceptId) ?? null
    if (!sourceRoot) {
      setError('Selected root concept was not found.')
      return
    }

    if (sourceRoot.part_of_concept_id) {
      setError('Copy is only supported for concepts that start at a root.')
      return
    }

    const conceptById = new Map(concepts.map((concept) => [concept.id, concept]))
    const childrenByParentId = new Map<string, ConceptRecord[]>()

    for (const concept of concepts) {
      if (!concept.part_of_concept_id) {
        continue
      }

      const siblings = childrenByParentId.get(concept.part_of_concept_id) ?? []
      siblings.push(concept)
      childrenByParentId.set(concept.part_of_concept_id, siblings)
    }

    for (const [parentId, siblings] of childrenByParentId) {
      siblings.sort((left, right) => {
        const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
        const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder
        }

        return left.name.localeCompare(right.name)
      })
      childrenByParentId.set(parentId, siblings)
    }

    const copiedBySourceId = new Map<string, ConceptRecord>()
    let copiedCount = 0

    const cloneNode = async (sourceId: string, copiedParentId: string | null): Promise<void> => {
      const source = conceptById.get(sourceId)
      if (!source) {
        return
      }

      const mappedReferenceId = source.reference_to_concept_id
        ? copiedBySourceId.get(source.reference_to_concept_id)?.id ?? null
        : null

      const payload: ConceptPayload = {
        name: source.name,
        description: source.description,
        concept_type_id: source.concept_type_id,
        part_of_concept_id: copiedParentId,
        part_order: copiedParentId ? source.part_order : null,
        reference_to_concept_id: mappedReferenceId,
      }

      const createResult = await createConceptWithRecord(payload)
      if (createResult.error || !createResult.data) {
        throw new Error(createResult.error ?? 'Failed to copy concept node.')
      }

      copiedBySourceId.set(source.id, createResult.data)
      copiedCount += 1

      const children = childrenByParentId.get(source.id) ?? []
      for (const child of children) {
        await cloneNode(child.id, createResult.data.id)
      }
    }

    try {
      await cloneNode(sourceRoot.id, null)
      setMessage(`Copied model from root '${sourceRoot.name}' (${copiedCount} concept(s)).`)
      await reloadConcepts()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError))
    }
  }

  const searchConcepts = useCallback(
    (searchTerm: string, type?: string) => {
      const normalizedSearchTerm = searchTerm.trim().toLowerCase()
      return concepts.filter((concept) => {
        const matchesSearchTerm =
          concept.name.toLowerCase().includes(normalizedSearchTerm) ||
          concept.description?.toLowerCase().includes(normalizedSearchTerm)

        const matchesType = type ? concept.concept_type_id === type : true

        return matchesSearchTerm && matchesType
      })
    },
    [concepts],
  )

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
    updateConceptFromPayload,
    submitConcept,
    editConcept,
    removeConcept,
    copyConceptModelFromRoot,
    clearPartOfForConcept,
    clearReferenceToForConcept,
    clearPartOfForConceptsBulk,
    clearReferenceToForConceptsBulk,
    runSafeAutoFix,
    moveConceptWithinParent,
    normalizeConceptSiblingOrders,
    resetForm,
    populateFromConcept,
    searchConcepts,
  }
}
