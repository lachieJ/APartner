import { useState } from 'react'
import type { ConceptRecord } from '../types'
import {
  getCompactDraftKey,
  getCompactPendingSelectionKeyForAdd,
  getCompactPendingSelectionKeyForEdit,
  getCompactReferenceCreateKeyForAdd,
  getCompactReferenceCreateKeyForEdit,
} from '../utils/conceptConventions'
import type {
  CompactConceptDraft,
  CompactCreateDraftByParentTypeKey,
  CompactEditDraftByConceptId,
  CompactPendingReferenceSelection,
  CompactPendingRootSelection,
  CompactQuickReferenceCreateDraft,
  CompactQuickReferenceDraftByKey,
  CompactRootCreateDraft,
} from '../types/compactMaintenance'

export function useConceptCompactUiState() {
  const [selectedRootTypeId, setSelectedRootTypeId] = useState('')
  const [selectedRootConceptId, setSelectedRootConceptId] = useState('')
  const [showEditControls, setShowEditControls] = useState(false)
  const [rootCreateDraft, setRootCreateDraft] = useState<CompactRootCreateDraft>({
    name: '',
    description: '',
  })
  const [addPanelByParentTypeKey, setAddPanelByParentTypeKey] = useState<Record<string, boolean>>({})
  const [createDraftByParentTypeKey, setCreateDraftByParentTypeKey] = useState<CompactCreateDraftByParentTypeKey>({})
  const [editPanelByConceptId, setEditPanelByConceptId] = useState<Record<string, boolean>>({})
  const [editDraftByConceptId, setEditDraftByConceptId] = useState<CompactEditDraftByConceptId>({})
  const [quickReferenceCreatePanelByKey, setQuickReferenceCreatePanelByKey] = useState<Record<string, boolean>>({})
  const [quickReferenceCreateDraftByKey, setQuickReferenceCreateDraftByKey] = useState<CompactQuickReferenceDraftByKey>({})
  const [pendingRootSelection, setPendingRootSelection] = useState<CompactPendingRootSelection | null>(null)
  const [pendingReferenceSelectionByKey, setPendingReferenceSelectionByKey] = useState<
    Record<string, CompactPendingReferenceSelection>
  >({})

  const getDraftKey = getCompactDraftKey

  const setCreateDraft = (
    parentConceptId: string,
    childConceptTypeId: string,
    next: Partial<CompactConceptDraft>,
  ) => {
    const key = getDraftKey(parentConceptId, childConceptTypeId)
    setCreateDraftByParentTypeKey((previous) => ({
      ...previous,
      [key]: {
        ...(previous[key] ?? { name: '', description: '', referenceToConceptId: '' }),
        ...next,
      },
    }))
  }

  const clearCreateDraft = (parentConceptId: string, childConceptTypeId: string) => {
    const key = getDraftKey(parentConceptId, childConceptTypeId)
    setCreateDraftByParentTypeKey((previous) => {
      if (!previous[key]) {
        return previous
      }

      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  const toggleAddPanel = (parentConceptId: string, childConceptTypeId: string) => {
    if (!showEditControls) {
      return
    }

    const key = getDraftKey(parentConceptId, childConceptTypeId)
    setAddPanelByParentTypeKey((previous) => ({
      ...previous,
      [key]: !previous[key],
    }))
  }

  const openEditPanel = (concept: ConceptRecord) => {
    if (!showEditControls) {
      return
    }

    setEditPanelByConceptId((previous) => ({
      ...previous,
      [concept.id]: true,
    }))
    setEditDraftByConceptId((previous) => ({
      ...previous,
      [concept.id]: {
        name: concept.name,
        description: concept.description ?? '',
        referenceToConceptId: concept.reference_to_concept_id ?? '',
      },
    }))
  }

  const closeEditPanel = (conceptId: string) => {
    setEditPanelByConceptId((previous) => ({
      ...previous,
      [conceptId]: false,
    }))
  }

  const setEditDraft = (conceptId: string, next: Partial<CompactConceptDraft>) => {
    setEditDraftByConceptId((previous) => ({
      ...previous,
      [conceptId]: {
        ...(previous[conceptId] ?? { name: '', description: '', referenceToConceptId: '' }),
        ...next,
      },
    }))
  }

  const getReferenceCreateKeyForEdit = getCompactReferenceCreateKeyForEdit

  const getReferenceCreateKeyForAdd = getCompactReferenceCreateKeyForAdd

  const getPendingSelectionKeyForEdit = getCompactPendingSelectionKeyForEdit

  const getPendingSelectionKeyForAdd = getCompactPendingSelectionKeyForAdd

  const setQuickReferenceCreateDraft = (panelKey: string, next: Partial<CompactQuickReferenceCreateDraft>) => {
    setQuickReferenceCreateDraftByKey((previous) => ({
      ...previous,
      [panelKey]: {
        ...(previous[panelKey] ?? { name: '', description: '', parentConceptId: '' }),
        ...next,
      },
    }))
  }

  const toggleQuickReferenceCreatePanel = (panelKey: string) => {
    setQuickReferenceCreatePanelByKey((previous) => ({
      ...previous,
      [panelKey]: !previous[panelKey],
    }))
  }

  const clearQuickReferenceCreateDraft = (panelKey: string) => {
    setQuickReferenceCreateDraftByKey((previous) => {
      if (!previous[panelKey]) {
        return previous
      }

      const next = { ...previous }
      delete next[panelKey]
      return next
    })
  }

  const closeQuickReferenceCreatePanel = (panelKey: string) => {
    setQuickReferenceCreatePanelByKey((previous) => ({
      ...previous,
      [panelKey]: false,
    }))
  }

  const setShowEditControlsWithReset = (nextValue: boolean) => {
    setShowEditControls(nextValue)
    if (!nextValue) {
      setAddPanelByParentTypeKey({})
      setEditPanelByConceptId({})
      setQuickReferenceCreatePanelByKey({})
      setQuickReferenceCreateDraftByKey({})
    }
  }

  return {
    selectedRootTypeId,
    setSelectedRootTypeId,
    selectedRootConceptId,
    setSelectedRootConceptId,
    showEditControls,
    setShowEditControlsWithReset,
    rootCreateDraft,
    setRootCreateDraft,
    addPanelByParentTypeKey,
    setAddPanelByParentTypeKey,
    createDraftByParentTypeKey,
    setCreateDraftByParentTypeKey,
    editPanelByConceptId,
    setEditPanelByConceptId,
    editDraftByConceptId,
    setEditDraftByConceptId,
    quickReferenceCreatePanelByKey,
    quickReferenceCreateDraftByKey,
    pendingRootSelection,
    setPendingRootSelection,
    pendingReferenceSelectionByKey,
    setPendingReferenceSelectionByKey,
    getDraftKey,
    setCreateDraft,
    clearCreateDraft,
    toggleAddPanel,
    openEditPanel,
    closeEditPanel,
    setEditDraft,
    getReferenceCreateKeyForEdit,
    getReferenceCreateKeyForAdd,
    getPendingSelectionKeyForEdit,
    getPendingSelectionKeyForAdd,
    setQuickReferenceCreateDraft,
    toggleQuickReferenceCreatePanel,
    clearQuickReferenceCreateDraft,
    closeQuickReferenceCreatePanel,
  }
}
