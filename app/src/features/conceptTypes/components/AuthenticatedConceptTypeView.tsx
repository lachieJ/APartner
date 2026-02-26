import type { FormEvent } from 'react'
import type { ConceptTypeRecord, ImportPreviewSummary, ImportSummary } from '../csv/types'
import type { ConceptTypeFormErrorField, ConceptTypeFormErrors } from '../types/form'
import { ConceptTypeForm } from './ConceptTypeForm'
import { ImportPanel } from './ImportPanel'
import { ConceptTypeList } from './ConceptTypeList'

type ConceptTypeOption = {
  id: string
  name: string
}

type AuthenticatedConceptTypeViewProps = {
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
  onEditConceptType: (conceptType: ConceptTypeRecord) => void
  onDeleteConceptType: (id: string) => void
  movingConceptTypeId: string | null
  onMoveConceptType: (id: string, direction: 'up' | 'down') => void
  normalizingSiblingOrders: boolean
  onNormalizeSiblingOrders: () => void
}

export function AuthenticatedConceptTypeView({
  editingId,
  name,
  description,
  partOfConceptTypeId,
  partOrder,
  referenceToConceptTypeId,
  formErrors,
  conceptTypeOptions,
  setName,
  setDescription,
  setPartOfConceptTypeId,
  setPartOrder,
  setReferenceToConceptTypeId,
  clearFieldError,
  onSubmitConceptType,
  onCancelConceptType,
  importCsvText,
  setImportCsvText,
  importFileName,
  importFileError,
  importing,
  loading,
  conceptTypes,
  importPreviewSummary,
  importSummary,
  onImportFileSelected,
  onPreviewImportConceptTypes,
  onImportConceptTypes,
  onDownloadSampleCsv,
  onExportConceptTypes,
  onClearImportFields,
  onDownloadImportErrorsCsv,
  clearFileStatus,
  onEditConceptType,
  onDeleteConceptType,
  movingConceptTypeId,
  onMoveConceptType,
  normalizingSiblingOrders,
  onNormalizeSiblingOrders,
}: AuthenticatedConceptTypeViewProps) {
  return (
    <>
      <ConceptTypeForm
        editingId={editingId}
        name={name}
        description={description}
        partOfConceptTypeId={partOfConceptTypeId}
        partOrder={partOrder}
        referenceToConceptTypeId={referenceToConceptTypeId}
        formErrors={formErrors}
        conceptTypeOptions={conceptTypeOptions}
        setName={setName}
        setDescription={setDescription}
        setPartOfConceptTypeId={setPartOfConceptTypeId}
        setPartOrder={setPartOrder}
        setReferenceToConceptTypeId={setReferenceToConceptTypeId}
        clearFieldError={clearFieldError}
        onSubmit={onSubmitConceptType}
        onCancel={onCancelConceptType}
      />

      <section className="card">
        <h2>Concept Types</h2>
        <ImportPanel
          importCsvText={importCsvText}
          setImportCsvText={setImportCsvText}
          importFileName={importFileName}
          importFileError={importFileError}
          importing={importing}
          loading={loading}
          hasConceptTypes={conceptTypes.length > 0}
          importPreviewSummary={importPreviewSummary}
          importSummary={importSummary}
          onImportFileSelected={onImportFileSelected}
          onPreview={onPreviewImportConceptTypes}
          onImport={onImportConceptTypes}
          onDownloadSampleCsv={onDownloadSampleCsv}
          onExportCsv={onExportConceptTypes}
          onClear={onClearImportFields}
          onDownloadImportErrorsCsv={onDownloadImportErrorsCsv}
          clearFileStatus={clearFileStatus}
        />

        <ConceptTypeList
          conceptTypes={conceptTypes}
          loading={loading}
          onEdit={onEditConceptType}
          onDelete={onDeleteConceptType}
          movingConceptTypeId={movingConceptTypeId}
          onMoveConceptType={onMoveConceptType}
          normalizingSiblingOrders={normalizingSiblingOrders}
          onNormalizeSiblingOrders={onNormalizeSiblingOrders}
        />
      </section>
    </>
  )
}
