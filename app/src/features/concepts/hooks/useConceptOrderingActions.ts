import { useState } from 'react'
import { updateConceptPartOrder } from '../data/conceptService'
import type { ConceptRecord } from '../types'
import { groupSiblingsByParent, reorderSiblingList } from '../../shared/utils/siblingOrdering'

type UseConceptOrderingActionsParams = {
  concepts: ConceptRecord[]
  reloadConcepts: () => Promise<void>
  setMessage: (value: string | null) => void
  setError: (value: string | null) => void
}

export function useConceptOrderingActions({
  concepts,
  reloadConcepts,
  setMessage,
  setError,
}: UseConceptOrderingActionsParams) {
  const [movingConceptId, setMovingConceptId] = useState<string | null>(null)
  const [normalizingSiblingOrders, setNormalizingSiblingOrders] = useState(false)

  const moveConceptWithinParent = async (id: string, direction: 'up' | 'down') => {
    setMessage(null)
    setError(null)

    const concept = concepts.find((item) => item.id === id)
    if (!concept || !concept.part_of_concept_id) {
      return
    }

    const siblings = concepts.filter((item) => item.part_of_concept_id === concept.part_of_concept_id)
    const reorderedSiblings = reorderSiblingList(siblings, id, direction)
    if (!reorderedSiblings) {
      return
    }

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

    const siblingsByParentId = groupSiblingsByParent(concepts, (concept) => concept.part_of_concept_id)

    if (siblingsByParentId.size === 0) {
      setMessage('No concept sibling groups found to normalize.')
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

  return {
    movingConceptId,
    normalizingSiblingOrders,
    moveConceptWithinParent,
    normalizeConceptSiblingOrders,
  }
}