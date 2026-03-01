import type { FormEvent } from 'react'
import type { ImportPreviewSummary, ImportSummary } from '../csv/types'
import type { ConceptTypeRecord } from './domain'
import type { ConceptTypeFormErrorField, ConceptTypeFormErrors } from './form'

export type ConceptTypeOption = {
  id: string
  name: string
}

export type AuthenticatedConceptTypeWorkspace = {
  editingId: string | null
  name: string
  description: string
  partOfConceptTypeId: string
  partOrder: string
  referenceToConceptTypeId: string
  formErrors: ConceptTypeFormErrors
  conceptTypeOptions: ConceptTypeOption[]
  setName: (value: string) => void
  setDescription: (value: string) => void
  setPartOfConceptTypeId: (value: string) => void
  setPartOrder: (value: string) => void
  setReferenceToConceptTypeId: (value: string) => void
  clearFieldError: (field: ConceptTypeFormErrorField) => void
  onSubmitConceptType: (event: FormEvent<HTMLFormElement>) => void
  onCancelConceptType: () => void
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
  importPreviewSummary: ImportPreviewSummary | null
  importSummary: ImportSummary | null
  onImportFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void
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
  onEditConceptType: (conceptType: ConceptTypeRecord) => void
  onDeleteConceptType: (id: string) => void
  movingConceptTypeId: string | null
  onMoveConceptType: (id: string, direction: 'up' | 'down') => void
  normalizingSiblingOrders: boolean
  onNormalizeSiblingOrders: () => void
}