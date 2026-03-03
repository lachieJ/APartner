import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../csv/types'
import type { ConceptTypeFormErrors } from '../types/form'
import {
  type ConceptTypePayload,
  createConceptType,
  deleteConceptType,
  listConceptTypes,
  updateConceptTypePartOrder,
  updateConceptType,
} from '../data/conceptTypeService'
import { groupSiblingsByParent, reorderSiblingList } from '../../shared/utils/siblingOrdering'

type UseConceptTypesParams = {
  isAuthenticated: boolean
  editingId: string | null
  name: string
  partOfConceptTypeId: string
  partOrder: string
  referenceToConceptTypeId: string
  buildPayload: () => {
    name: string
    description: string | null
    part_of_concept_type_id: string | null
    part_order: number | null
    reference_to_concept_type_id: string | null
  }
  resetForm: () => void
  setMessage: (value: string | null) => void
  setError: (value: string | null) => void
  setFormErrors: (value: ConceptTypeFormErrors) => void
}

export function useConceptTypes({
  isAuthenticated,
  editingId,
  name,
  partOfConceptTypeId,
  partOrder,
  referenceToConceptTypeId,
  buildPayload,
  resetForm,
  setMessage,
  setError,
  setFormErrors,
}: UseConceptTypesParams) {
  const [conceptTypes, setConceptTypes] = useState<ConceptTypeRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [movingConceptTypeId, setMovingConceptTypeId] = useState<string | null>(null)
  const [normalizingSiblingOrders, setNormalizingSiblingOrders] = useState(false)

  const conceptTypeOptions = useMemo(
    () => conceptTypes.map((conceptType) => ({ id: conceptType.id, name: conceptType.name })),
    [conceptTypes],
  )

  const reloadConceptTypes = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await listConceptTypes()
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setConceptTypes(result.data)
    setLoading(false)
  }, [setError])

  useEffect(() => {
    if (isAuthenticated) {
      void reloadConceptTypes()
    } else {
      setConceptTypes([])
    }
  }, [isAuthenticated, reloadConceptTypes])

  const submitConceptType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setFormErrors({})

    const validationErrors: ConceptTypeFormErrors = {}

    if (!name.trim()) {
      validationErrors.name = 'Name is required.'
    }

    if (referenceToConceptTypeId && !partOfConceptTypeId) {
      validationErrors.partOfConceptTypeId = 'Part Of is required when Reference To is set.'
      validationErrors.referenceToConceptTypeId = 'Reference To requires Part Of.'
    }

    if (partOfConceptTypeId) {
      const parsedOrder = Number.parseInt(partOrder || '1', 10)
      if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
        validationErrors.partOrder = 'Order must be a whole number greater than 0.'
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      setError('Please fix the highlighted form fields.')
      return
    }

    const payload = buildPayload()

    const applyDbErrorToField = (dbError: string) => {
      const nextErrors: ConceptTypeFormErrors = {}

      if (dbError.includes('Name must be unique')) {
        nextErrors.name = dbError
      }
      if (dbError.includes('PartOfConceptTypeId') || dbError.includes('Part Of')) {
        nextErrors.partOfConceptTypeId = dbError
      }
      if (dbError.includes('ReferenceToConceptTypeId') || dbError.includes('Reference To')) {
        nextErrors.referenceToConceptTypeId = dbError
      }
      if (dbError.includes('Order within parent') || dbError.includes('Order must')) {
        nextErrors.partOrder = dbError
      }

      if (Object.keys(nextErrors).length > 0) {
        setFormErrors(nextErrors)
      }
    }

    if (editingId) {
      const updateError = await updateConceptType(editingId, payload)
      if (updateError) {
        applyDbErrorToField(updateError)
        setError(updateError)
        return
      }

      setMessage('ConceptType updated.')
    } else {
      const insertError = await createConceptType(payload)
      if (insertError) {
        applyDbErrorToField(insertError)
        setError(insertError)
        return
      }

      setMessage('ConceptType created.')
    }

    resetForm()
    setFormErrors({})
    await reloadConceptTypes()
  }

  const validateConceptTypePayload = (payload: ConceptTypePayload): string | null => {
    if (!payload.name.trim()) {
      return 'Name is required.'
    }

    if (payload.reference_to_concept_type_id && !payload.part_of_concept_type_id) {
      return 'Reference To requires Part Of.'
    }

    if (payload.part_of_concept_type_id && payload.part_order !== null && payload.part_order < 1) {
      return 'Order within parent must be a whole number greater than 0.'
    }

    return null
  }

  const createConceptTypeFromPayload = async (payload: ConceptTypePayload, successMessage?: string) => {
    setMessage(null)
    setError(null)

    const validationError = validateConceptTypePayload(payload)
    if (validationError) {
      setError(validationError)
      return false
    }

    const createError = await createConceptType(payload)
    if (createError) {
      setError(createError)
      return false
    }

    setMessage(successMessage ?? 'ConceptType created.')
    await reloadConceptTypes()
    return true
  }

  const updateConceptTypeFromPayload = async (id: string, payload: ConceptTypePayload, successMessage?: string) => {
    setMessage(null)
    setError(null)

    const validationError = validateConceptTypePayload(payload)
    if (validationError) {
      setError(validationError)
      return false
    }

    const updateError = await updateConceptType(id, payload)
    if (updateError) {
      setError(updateError)
      return false
    }

    setMessage(successMessage ?? 'ConceptType updated.')
    await reloadConceptTypes()
    return true
  }

  const removeConceptType = async (id: string) => {
    setMessage(null)
    setError(null)

    const deleteError = await deleteConceptType(id)
    if (deleteError) {
      setError(deleteError)
      return
    }

    if (editingId === id) {
      resetForm()
    }

    setMessage('ConceptType deleted.')
    await reloadConceptTypes()
  }

  const moveConceptTypeWithinParent = async (id: string, direction: 'up' | 'down') => {
    setMessage(null)
    setError(null)

    const conceptType = conceptTypes.find((item) => item.id === id)
    if (!conceptType || !conceptType.part_of_concept_type_id) {
      return
    }

    const siblings = conceptTypes.filter((item) => item.part_of_concept_type_id === conceptType.part_of_concept_type_id)
    const reorderedSiblings = reorderSiblingList(siblings, id, direction)
    if (!reorderedSiblings) {
      return
    }

    setMovingConceptTypeId(id)
    try {
      for (let index = 0; index < reorderedSiblings.length; index += 1) {
        const sibling = reorderedSiblings[index]
        const nextOrder = index + 1
        if (sibling.part_order === nextOrder) {
          continue
        }

        const updateError = await updateConceptTypePartOrder(sibling.id, nextOrder)
        if (updateError) {
          setError(updateError)
          return
        }
      }

      setMessage(`Moved '${conceptType.name}' ${direction}.`)
      await reloadConceptTypes()
    } finally {
      setMovingConceptTypeId(null)
    }
  }

  const normalizeSiblingOrders = async () => {
    setMessage(null)
    setError(null)

    const siblingsByParentId = groupSiblingsByParent(conceptTypes, (conceptType) => conceptType.part_of_concept_type_id)

    if (siblingsByParentId.size === 0) {
      setMessage('No sibling groups found to normalize.')
      return
    }

    let updatedCount = 0

    setNormalizingSiblingOrders(true)
    try {
      for (const siblings of siblingsByParentId.values()) {
        for (let index = 0; index < siblings.length; index += 1) {
          const sibling = siblings[index]
          const normalizedOrder = index + 1

          if (sibling.part_order === normalizedOrder) {
            continue
          }

          const updateError = await updateConceptTypePartOrder(sibling.id, normalizedOrder)
          if (updateError) {
            setError(updateError)
            return
          }

          updatedCount += 1
        }
      }

      if (updatedCount === 0) {
        setMessage('Sibling orders are already normalized.')
      } else {
        setMessage(`Normalized sibling order for ${updatedCount} metamodel type(s).`)
      }

      await reloadConceptTypes()
    } finally {
      setNormalizingSiblingOrders(false)
    }
  }

  return {
    conceptTypes,
    conceptTypeOptions,
    loading,
    movingConceptTypeId,
    normalizingSiblingOrders,
    reloadConceptTypes,
    submitConceptType,
    createConceptTypeFromPayload,
    updateConceptTypeFromPayload,
    removeConceptType,
    moveConceptTypeWithinParent,
    normalizeSiblingOrders,
  }
}
