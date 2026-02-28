import { useEffect, useState } from 'react'
import { ConceptTypeForm } from './ConceptTypeForm'
import { ImportPanel } from './ImportPanel'
import { ConceptTypeList } from './ConceptTypeList'
import { ModelManagementPanel } from './ModelManagementPanel'
import { ConceptModelPanel } from '../../concepts/components/ConceptModelPanel'
import type { AuthenticatedConceptTypeWorkspace } from '../types/workspace'

type AuthenticatedConceptTypeViewProps = {
  isAuthenticated: boolean
  workspace: AuthenticatedConceptTypeWorkspace
}

export function AuthenticatedConceptTypeView({
  isAuthenticated,
  workspace,
}: AuthenticatedConceptTypeViewProps) {
  const {
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
    importMode,
    setImportMode,
    allowDeletes,
    setAllowDeletes,
    confirmHighImpact,
    setConfirmHighImpact,
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
    actionInProgress,
    managementReason,
    setManagementReason,
    managementConfirmText,
    setManagementConfirmText,
    structureRootId,
    setStructureRootId,
    structureRootOptions,
    structurePreview,
    structureExternalReferencePolicy,
    setStructureExternalReferencePolicy,
    createVersionOnReset,
    setCreateVersionOnReset,
    createVersionOnStructureDelete,
    setCreateVersionOnStructureDelete,
    onResetModel,
    onDeleteStructure,
    onPurgeModel,
    onEditConceptType,
    onDeleteConceptType,
    movingConceptTypeId,
    onMoveConceptType,
    normalizingSiblingOrders,
    onNormalizeSiblingOrders,
  } = workspace

  const [activeTab, setActiveTab] = useState<'edit' | 'models' | 'import' | 'manage'>(() => {
    const stored = window.localStorage.getItem('conceptType.activeTab')
    if (stored === 'edit' || stored === 'models' || stored === 'import' || stored === 'manage') {
      return stored
    }
    return 'edit'
  })

  useEffect(() => {
    window.localStorage.setItem('conceptType.activeTab', activeTab)
  }, [activeTab])

  return (
    <>
      <div className="stickyToolbar">
        <div className="tabRow" role="tablist" aria-label="Workspace sections">
          <button
            type="button"
            className={activeTab === 'edit' ? 'tabButton active' : 'tabButton'}
            onClick={() => setActiveTab('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            className={activeTab === 'models' ? 'tabButton active' : 'tabButton'}
            onClick={() => setActiveTab('models')}
          >
            Models
          </button>
          <button
            type="button"
            className={activeTab === 'import' ? 'tabButton active' : 'tabButton'}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
          <button
            type="button"
            className={activeTab === 'manage' ? 'tabButton active' : 'tabButton'}
            onClick={() => setActiveTab('manage')}
          >
            Model Management
          </button>
        </div>
        <p className="hint">
          {activeTab === 'edit'
            ? 'Create, update, and inspect concept types.'
            : activeTab === 'models'
              ? 'Create concept models as instances constrained by ConceptType semantics.'
            : activeTab === 'import'
              ? 'Run CSV preview/import with safety checks and impact summary.'
              : 'Run high-impact operations (reset, structure delete, purge) with confirmations.'}
        </p>
      </div>

      {activeTab === 'edit' ? (
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
      ) : null}

      {activeTab === 'import' ? (
        <section className="card">
          <h2>Import & Export</h2>
          <ImportPanel
            importCsvText={importCsvText}
            setImportCsvText={setImportCsvText}
            importFileName={importFileName}
            importFileError={importFileError}
            importing={importing}
            loading={loading}
            hasConceptTypes={conceptTypes.length > 0}
            importMode={importMode}
            setImportMode={setImportMode}
            allowDeletes={allowDeletes}
            setAllowDeletes={setAllowDeletes}
            confirmHighImpact={confirmHighImpact}
            setConfirmHighImpact={setConfirmHighImpact}
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
        </section>
      ) : null}

      {activeTab === 'models' ? (
        <ConceptModelPanel isAuthenticated={isAuthenticated} conceptTypes={conceptTypes} />
      ) : null}

      {activeTab === 'manage' ? (
        <ModelManagementPanel
          conceptTypeCount={conceptTypes.length}
          actionInProgress={actionInProgress}
          managementReason={managementReason}
          setManagementReason={setManagementReason}
          managementConfirmText={managementConfirmText}
          setManagementConfirmText={setManagementConfirmText}
          structureRootId={structureRootId}
          setStructureRootId={setStructureRootId}
          structureRootOptions={structureRootOptions}
          structurePreview={structurePreview}
          structureExternalReferencePolicy={structureExternalReferencePolicy}
          setStructureExternalReferencePolicy={setStructureExternalReferencePolicy}
          createVersionOnReset={createVersionOnReset}
          setCreateVersionOnReset={setCreateVersionOnReset}
          createVersionOnStructureDelete={createVersionOnStructureDelete}
          setCreateVersionOnStructureDelete={setCreateVersionOnStructureDelete}
          onResetModel={onResetModel}
          onDeleteStructure={onDeleteStructure}
          onPurgeModel={onPurgeModel}
        />
      ) : null}
    </>
  )
}
