import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import type { ConceptTypeRecord } from '../csv/types'
import type { ConceptTypeFormErrorField, ConceptTypeFormErrors } from '../types/form'
import type { AuthenticatedConceptTypeWorkspace, ConceptTypeOption } from '../types/workspace'

type UseAuthenticatedConceptTypeWorkspaceParams = {
  formErrors: ConceptTypeFormErrors
  setFormErrors: Dispatch<SetStateAction<ConceptTypeFormErrors>>
  clearFormErrors: () => void
  handleFormCancel: () => void
  handleEditConceptType: (conceptType: ConceptTypeRecord) => void
  editingId: string | null
  name: string
  description: string
  partOfConceptTypeId: string
  partOrder: string
  referenceToConceptTypeId: string
  conceptTypeOptions: ConceptTypeOption[]
  setName: (value: string) => void
  setDescription: (value: string) => void
  setPartOfConceptTypeId: (value: string) => void
  setPartOrder: (value: string) => void
  setReferenceToConceptTypeId: (value: string) => void
  onSubmitConceptType: (event: FormEvent<HTMLFormElement>) => void
  importCsvText: string
  setImportCsvText: (value: string) => void
  importFileName: string | null
  importFileError: string | null
  importing: boolean
  loading: boolean
  conceptTypes: ConceptTypeRecord[]
  importMode: 'upsert-only' | 'full-sync'
  setImportMode: (value: 'upsert-only' | 'full-sync') => void
  allowDeletes: boolean
  setAllowDeletes: (value: boolean) => void
  confirmHighImpact: boolean
  setConfirmHighImpact: (value: boolean) => void
  importPreviewSummary: AuthenticatedConceptTypeWorkspace['importPreviewSummary']
  importSummary: AuthenticatedConceptTypeWorkspace['importSummary']
  onImportFileSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onPreviewImportConceptTypes: () => void
  onImportConceptTypes: () => void
  onDownloadSampleCsv: () => void
  onExportConceptTypes: () => void
  onClearImportFields: () => void
  onDownloadImportErrorsCsv: () => void
  clearFileStatus: () => void
  actionInProgress: 'reset' | 'structure' | 'purge' | null
  managementReason: string
  setManagementReason: (value: string) => void
  managementConfirmText: string
  setManagementConfirmText: (value: string) => void
  structureRootId: string
  setStructureRootId: (value: string) => void
  structureRootOptions: { id: string; name: string }[]
  structurePreview: {
    subtreeSize: number
    externalPartOfBlockers: { id: string; name: string }[]
    externalReferenceBlockers: { id: string; name: string }[]
  }
  structureExternalReferencePolicy: 'block' | 'null-reference-to'
  setStructureExternalReferencePolicy: (value: 'block' | 'null-reference-to') => void
  createVersionOnReset: boolean
  setCreateVersionOnReset: (value: boolean) => void
  createVersionOnStructureDelete: boolean
  setCreateVersionOnStructureDelete: (value: boolean) => void
  onResetModel: () => void
  onDeleteStructure: () => void
  onPurgeModel: () => void
  onDeleteConceptType: (id: string) => void
  movingConceptTypeId: string | null
  onMoveConceptType: (id: string, direction: 'up' | 'down') => void
  normalizingSiblingOrders: boolean
  onNormalizeSiblingOrders: () => void
}

export function useAuthenticatedConceptTypeWorkspace(
  params: UseAuthenticatedConceptTypeWorkspaceParams,
): AuthenticatedConceptTypeWorkspace {
  const clearFieldError = (field: ConceptTypeFormErrorField) => {
    params.setFormErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  return {
    editingId: params.editingId,
    name: params.name,
    description: params.description,
    partOfConceptTypeId: params.partOfConceptTypeId,
    partOrder: params.partOrder,
    referenceToConceptTypeId: params.referenceToConceptTypeId,
    formErrors: params.formErrors,
    conceptTypeOptions: params.conceptTypeOptions,
    setName: params.setName,
    setDescription: params.setDescription,
    setPartOfConceptTypeId: params.setPartOfConceptTypeId,
    setPartOrder: params.setPartOrder,
    setReferenceToConceptTypeId: params.setReferenceToConceptTypeId,
    clearFieldError,
    onSubmitConceptType: params.onSubmitConceptType,
    onCancelConceptType: () => {
      params.clearFormErrors()
      params.handleFormCancel()
    },
    importCsvText: params.importCsvText,
    setImportCsvText: params.setImportCsvText,
    importFileName: params.importFileName,
    importFileError: params.importFileError,
    importing: params.importing,
    loading: params.loading,
    conceptTypes: params.conceptTypes,
    importMode: params.importMode,
    setImportMode: params.setImportMode,
    allowDeletes: params.allowDeletes,
    setAllowDeletes: params.setAllowDeletes,
    confirmHighImpact: params.confirmHighImpact,
    setConfirmHighImpact: params.setConfirmHighImpact,
    importPreviewSummary: params.importPreviewSummary,
    importSummary: params.importSummary,
    onImportFileSelected: params.onImportFileSelected,
    onPreviewImportConceptTypes: params.onPreviewImportConceptTypes,
    onImportConceptTypes: params.onImportConceptTypes,
    onDownloadSampleCsv: params.onDownloadSampleCsv,
    onExportConceptTypes: params.onExportConceptTypes,
    onClearImportFields: params.onClearImportFields,
    onDownloadImportErrorsCsv: params.onDownloadImportErrorsCsv,
    clearFileStatus: params.clearFileStatus,
    actionInProgress: params.actionInProgress,
    managementReason: params.managementReason,
    setManagementReason: params.setManagementReason,
    managementConfirmText: params.managementConfirmText,
    setManagementConfirmText: params.setManagementConfirmText,
    structureRootId: params.structureRootId,
    setStructureRootId: params.setStructureRootId,
    structureRootOptions: params.structureRootOptions,
    structurePreview: params.structurePreview,
    structureExternalReferencePolicy: params.structureExternalReferencePolicy,
    setStructureExternalReferencePolicy: params.setStructureExternalReferencePolicy,
    createVersionOnReset: params.createVersionOnReset,
    setCreateVersionOnReset: params.setCreateVersionOnReset,
    createVersionOnStructureDelete: params.createVersionOnStructureDelete,
    setCreateVersionOnStructureDelete: params.setCreateVersionOnStructureDelete,
    onResetModel: params.onResetModel,
    onDeleteStructure: params.onDeleteStructure,
    onPurgeModel: params.onPurgeModel,
    onEditConceptType: (conceptType) => {
      params.clearFormErrors()
      params.handleEditConceptType(conceptType)
    },
    onDeleteConceptType: params.onDeleteConceptType,
    movingConceptTypeId: params.movingConceptTypeId,
    onMoveConceptType: params.onMoveConceptType,
    normalizingSiblingOrders: params.normalizingSiblingOrders,
    onNormalizeSiblingOrders: params.onNormalizeSiblingOrders,
  }
}