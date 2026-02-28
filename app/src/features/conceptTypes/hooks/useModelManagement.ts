import { useEffect, useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../csv/types'
import { clearReferenceToLinksForTargets, deleteAllConceptTypes, deleteConceptTypesBulk } from '../data/conceptTypeService'
import { createModelVersionSnapshot } from '../data/modelVersioningService'

type UseModelManagementParams = {
  conceptTypes: ConceptTypeRecord[]
  reloadConceptTypes: () => Promise<void>
  setMessage: (value: string | null) => void
  setError: (value: string | null) => void
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const getConfiguredWorkspaceId = () => {
  const workspaceId = String(import.meta.env.VITE_MODEL_WORKSPACE_ID ?? '').trim()
  if (!workspaceId) return null
  if (!UUID_REGEX.test(workspaceId)) return null
  return workspaceId
}

const getSubtreeIds = (conceptTypes: ConceptTypeRecord[], rootId: string) => {
  const byParentId = new Map<string, string[]>()
  for (const item of conceptTypes) {
    if (!item.part_of_concept_type_id || item.part_of_concept_type_id === item.id) {
      continue
    }

    const ids = byParentId.get(item.part_of_concept_type_id) ?? []
    ids.push(item.id)
    byParentId.set(item.part_of_concept_type_id, ids)
  }

  const visited = new Set<string>()
  const stack = [rootId]
  while (stack.length > 0) {
    const currentId = stack.pop()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const children = byParentId.get(currentId) ?? []
    for (const childId of children) {
      stack.push(childId)
    }
  }

  return visited
}

export function useModelManagement({ conceptTypes, reloadConceptTypes, setMessage, setError }: UseModelManagementParams) {
  const [actionInProgress, setActionInProgress] = useState<'reset' | 'structure' | 'purge' | null>(null)
  const [managementReason, setManagementReason] = useState('')
  const [managementConfirmText, setManagementConfirmText] = useState('')
  const [structureRootId, setStructureRootId] = useState(() => {
    return window.localStorage.getItem('conceptType.structureRootId') ?? ''
  })
  const [createVersionOnReset, setCreateVersionOnReset] = useState(true)
  const [createVersionOnStructureDelete, setCreateVersionOnStructureDelete] = useState(true)
  const [structureExternalReferencePolicy, setStructureExternalReferencePolicy] = useState<'block' | 'null-reference-to'>(
    () => {
      const stored = window.localStorage.getItem('conceptType.structureExternalReferencePolicy')
      if (stored === 'block' || stored === 'null-reference-to') {
        return stored
      }
      return 'block'
    },
  )

  useEffect(() => {
    window.localStorage.setItem('conceptType.structureExternalReferencePolicy', structureExternalReferencePolicy)
  }, [structureExternalReferencePolicy])

  useEffect(() => {
    if (!structureRootId) {
      window.localStorage.removeItem('conceptType.structureRootId')
      return
    }

    const exists = conceptTypes.some((item) => item.id === structureRootId)
    if (!exists) {
      setStructureRootId('')
      window.localStorage.removeItem('conceptType.structureRootId')
      return
    }

    window.localStorage.setItem('conceptType.structureRootId', structureRootId)
  }, [conceptTypes, structureRootId])

  const structureRootOptions = useMemo(
    () => conceptTypes.map((item) => ({ id: item.id, name: item.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [conceptTypes],
  )

  const structurePreview = useMemo(() => {
    if (!structureRootId) {
      return {
        subtreeSize: 0,
        externalPartOfBlockers: [] as { id: string; name: string }[],
        externalReferenceBlockers: [] as { id: string; name: string }[],
      }
    }

    const subtreeIds = getSubtreeIds(conceptTypes, structureRootId)

    const externalPartOfBlockers = conceptTypes
      .filter((item) => {
        if (subtreeIds.has(item.id)) return false

        return Boolean(item.part_of_concept_type_id && subtreeIds.has(item.part_of_concept_type_id))
      })
      .map((item) => ({ id: item.id, name: item.name }))
      .sort((left, right) => left.name.localeCompare(right.name))

    const externalReferenceBlockers = conceptTypes
      .filter((item) => {
        if (subtreeIds.has(item.id)) return false

        return Boolean(item.reference_to_concept_type_id && subtreeIds.has(item.reference_to_concept_type_id))
      })
      .map((item) => ({ id: item.id, name: item.name }))
      .sort((left, right) => left.name.localeCompare(right.name))

    return {
      subtreeSize: subtreeIds.size,
      externalPartOfBlockers,
      externalReferenceBlockers,
    }
  }, [conceptTypes, structureRootId])

  const clearManagementInputs = () => {
    setManagementReason('')
    setManagementConfirmText('')
  }

  const createSnapshotIfRequested = async (
    shouldCreateVersion: boolean,
    filename: string,
    reason: string,
    counts: { created: number; updated: number; deleted: number; unchanged: number; total: number },
  ) => {
    if (!shouldCreateVersion) return null

    const workspaceId = getConfiguredWorkspaceId()
    if (!workspaceId) {
      return 'Model version snapshot requires VITE_MODEL_WORKSPACE_ID (UUID) in app/.env.local.'
    }

    const snapshotResult = await createModelVersionSnapshot({
      workspaceId,
      filename,
      reason,
      source: 'manual',
      changeSummary: {
        counts,
      },
    })

    return snapshotResult.error
  }

  const resetModel = async () => {
    setMessage(null)
    setError(null)

    if (managementConfirmText.trim().toUpperCase() !== 'RESET') {
      setError('Type RESET to confirm model reset.')
      return
    }

    if (!managementReason.trim()) {
      setError('Reason is required for reset.')
      return
    }

    setActionInProgress('reset')
    try {
      const snapshotError = await createSnapshotIfRequested(
        createVersionOnReset,
        'model-reset',
        managementReason,
        {
          created: 0,
          updated: 0,
          deleted: conceptTypes.length,
          unchanged: 0,
          total: conceptTypes.length,
        },
      )

      if (snapshotError) {
        setError(snapshotError)
        return
      }

      const deleteError = await deleteAllConceptTypes()
      if (deleteError) {
        setError(deleteError)
        return
      }

      await reloadConceptTypes()
      setMessage(`Model reset complete. Deleted ${conceptTypes.length} concept type(s).`)
      clearManagementInputs()
    } finally {
      setActionInProgress(null)
    }
  }

  const deleteStructure = async () => {
    setMessage(null)
    setError(null)

    if (!structureRootId) {
      setError('Select a root concept type for structure delete.')
      return
    }

    if (managementConfirmText.trim().toUpperCase() !== 'DELETE STRUCTURE') {
      setError('Type DELETE STRUCTURE to confirm structure delete.')
      return
    }

    if (!managementReason.trim()) {
      setError('Reason is required for structure delete.')
      return
    }

    if (structurePreview.externalPartOfBlockers.length > 0) {
      setError(
        `Structure delete blocked by external PartOf links: ${structurePreview.externalPartOfBlockers
          .slice(0, 5)
          .map((item) => item.name)
          .join(', ')}${structurePreview.externalPartOfBlockers.length > 5 ? '…' : ''}`,
      )
      return
    }

    if (structurePreview.externalReferenceBlockers.length > 0 && structureExternalReferencePolicy === 'block') {
      setError(
        `Structure delete blocked by external ReferenceTo links: ${structurePreview.externalReferenceBlockers
          .slice(0, 5)
          .map((item) => item.name)
          .join(', ')}${
          structurePreview.externalReferenceBlockers.length > 5 ? '…' : ''
        }. Choose "Null ReferenceTo blockers and continue" to proceed.`,
      )
      return
    }

    const subtreeIds = Array.from(getSubtreeIds(conceptTypes, structureRootId))
    const nullifiedReferenceCount =
      structureExternalReferencePolicy === 'null-reference-to' ? structurePreview.externalReferenceBlockers.length : 0

    setActionInProgress('structure')
    try {
      const snapshotError = await createSnapshotIfRequested(
        createVersionOnStructureDelete,
        'structure-delete',
        managementReason,
        {
          created: 0,
          updated: nullifiedReferenceCount,
          deleted: subtreeIds.length,
          unchanged: 0,
          total: subtreeIds.length + nullifiedReferenceCount,
        },
      )

      if (snapshotError) {
        setError(snapshotError)
        return
      }

      if (structureExternalReferencePolicy === 'null-reference-to' && nullifiedReferenceCount > 0) {
        const clearReferenceError = await clearReferenceToLinksForTargets(subtreeIds)
        if (clearReferenceError) {
          setError(clearReferenceError)
          return
        }
      }

      const deleteError = await deleteConceptTypesBulk(subtreeIds)
      if (deleteError) {
        setError(deleteError)
        return
      }

      await reloadConceptTypes()
      setMessage(
        `Structure delete complete. Deleted ${subtreeIds.length} concept type(s)${
          nullifiedReferenceCount > 0 ? ` and cleared ${nullifiedReferenceCount} external ReferenceTo link(s)` : ''
        }.`,
      )
      clearManagementInputs()
    } finally {
      setActionInProgress(null)
    }
  }

  const purgeModel = async () => {
    setMessage(null)
    setError(null)

    if (managementConfirmText.trim().toUpperCase() !== 'PURGE') {
      setError('Type PURGE to confirm emergency purge.')
      return
    }

    if (!managementReason.trim()) {
      setError('Reason is required for purge.')
      return
    }

    setActionInProgress('purge')
    try {
      const deleteError = await deleteAllConceptTypes()
      if (deleteError) {
        setError(deleteError)
        return
      }

      await reloadConceptTypes()
      setMessage(`Emergency purge complete. Deleted ${conceptTypes.length} concept type(s) without version snapshot.`)
      clearManagementInputs()
    } finally {
      setActionInProgress(null)
    }
  }

  return {
    actionInProgress,
    managementReason,
    setManagementReason,
    managementConfirmText,
    setManagementConfirmText,
    structureRootId,
    setStructureRootId,
    structureRootOptions,
    structurePreview,
    createVersionOnReset,
    setCreateVersionOnReset,
    createVersionOnStructureDelete,
    setCreateVersionOnStructureDelete,
    structureExternalReferencePolicy,
    setStructureExternalReferencePolicy,
    resetModel,
    deleteStructure,
    purgeModel,
  }
}
