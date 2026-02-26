import { useCallback } from 'react'
import type { ConceptTypeRecord } from '../csv/types'

type UseConceptTypeUiHandlersParams = {
  resetForm: () => void
  clearStatus: () => void
  startEdit: (conceptType: ConceptTypeRecord) => void
}

export function useConceptTypeUiHandlers({
  resetForm,
  clearStatus,
  startEdit,
}: UseConceptTypeUiHandlersParams) {
  const handleFormCancel = useCallback(() => {
    resetForm()
    clearStatus()
  }, [resetForm, clearStatus])

  const handleEditConceptType = useCallback(
    (conceptType: ConceptTypeRecord) => {
      startEdit(conceptType)
      clearStatus()
    },
    [startEdit, clearStatus],
  )

  return {
    handleFormCancel,
    handleEditConceptType,
  }
}
