import { useState } from 'react'
import { useAuthSession } from './features/conceptTypes/hooks/useAuthSession'
import { useAuthActions } from './features/conceptTypes/hooks/useAuthActions'
import { useConceptTypeFormState } from './features/conceptTypes/hooks/useConceptTypeFormState'
import { useConceptTypeImport } from './features/conceptTypes/hooks/useConceptTypeImport'
import { useModelManagement } from './features/conceptTypes/hooks/useModelManagement'
import { useConceptTypeUiHandlers } from './features/conceptTypes/hooks/useConceptTypeUiHandlers'
import { useConceptTypes } from './features/conceptTypes/hooks/useConceptTypes'
import { useStatusMessage } from './features/conceptTypes/hooks/useStatusMessage'
import { AuthenticatedConceptTypeView } from './features/conceptTypes/components/AuthenticatedConceptTypeView'
import { SignInPanel } from './features/conceptTypes/components/SignInPanel'
import type { ConceptTypeFormErrorField, ConceptTypeFormErrors } from './features/conceptTypes/types/form'
import './App.css'

function App() {
  const { session, email, setEmail, sendMagicLink: sendMagicLinkRequest, signOut: signOutRequest } =
    useAuthSession()
  const { message, error, setMessage, setError, clearStatus } = useStatusMessage()
  const [formErrors, setFormErrors] = useState<ConceptTypeFormErrors>({})

  const clearFormErrors = () => setFormErrors({})

  const clearFieldError = (field: ConceptTypeFormErrorField) => {
    setFormErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const {
    editingId,
    name,
    description,
    partOfConceptTypeId,
    partOrder,
    referenceToConceptTypeId,
    setName,
    setDescription,
    setPartOfConceptTypeId,
    setPartOrder,
    setReferenceToConceptTypeId,
    resetForm,
    startEdit,
    buildPayload,
  } = useConceptTypeFormState()

  const {
    conceptTypes,
    conceptTypeOptions,
    loading,
    movingConceptTypeId,
    normalizingSiblingOrders,
    reloadConceptTypes,
    submitConceptType,
    removeConceptType,
    moveConceptTypeWithinParent,
    normalizeSiblingOrders,
  } = useConceptTypes({
    isAuthenticated: Boolean(session),
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
  })

  const {
    importCsvText,
    setImportCsvText,
    importing,
    importPreviewSummary,
    importSummary,
    importMode,
    setImportMode,
    allowDeletes,
    setAllowDeletes,
    confirmHighImpact,
    setConfirmHighImpact,
    importFileName,
    importFileError,
    onImportFileSelected,
    previewImportConceptTypes,
    importConceptTypes,
    exportConceptTypes,
    downloadSampleCsv,
    downloadImportErrorsCsv,
    clearImportFields,
    clearFileStatus,
  } = useConceptTypeImport({
    conceptTypes,
    reloadConceptTypes,
    setMessage,
    setError,
  })

  const {
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
    resetModel,
    deleteStructure,
    purgeModel,
  } = useModelManagement({
    conceptTypes,
    reloadConceptTypes,
    setMessage,
    setError,
  })

  const { sendMagicLink, signOut } = useAuthActions({
    sendMagicLinkRequest,
    signOutRequest,
    resetForm,
    setMessage,
    setError,
    clearStatus,
  })

  const { handleFormCancel, handleEditConceptType } = useConceptTypeUiHandlers({
    resetForm,
    clearStatus,
    startEdit,
  })

  return (
    <main className="page">
      <header className="header">
        <h1>ConceptType Admin (MVP)</h1>
        {session ? (
          <div className="sessionBar">
            <span>{session.user.email}</span>
            <button onClick={signOut}>Sign out</button>
          </div>
        ) : null}
      </header>

      {!session ? (
        <SignInPanel email={email} setEmail={setEmail} onSubmit={sendMagicLink} />
      ) : (
        <AuthenticatedConceptTypeView
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
          onSubmitConceptType={submitConceptType}
          onCancelConceptType={() => {
            clearFormErrors()
            handleFormCancel()
          }}
          importCsvText={importCsvText}
          setImportCsvText={setImportCsvText}
          importFileName={importFileName}
          importFileError={importFileError}
          importing={importing}
          loading={loading}
          conceptTypes={conceptTypes}
          importMode={importMode}
          setImportMode={setImportMode}
          allowDeletes={allowDeletes}
          setAllowDeletes={setAllowDeletes}
          confirmHighImpact={confirmHighImpact}
          setConfirmHighImpact={setConfirmHighImpact}
          importPreviewSummary={importPreviewSummary}
          importSummary={importSummary}
          onImportFileSelected={onImportFileSelected}
          onPreviewImportConceptTypes={previewImportConceptTypes}
          onImportConceptTypes={importConceptTypes}
          onDownloadSampleCsv={downloadSampleCsv}
          onExportConceptTypes={exportConceptTypes}
          onClearImportFields={clearImportFields}
          onDownloadImportErrorsCsv={downloadImportErrorsCsv}
          clearFileStatus={clearFileStatus}
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
          onResetModel={resetModel}
          onDeleteStructure={deleteStructure}
          onPurgeModel={purgeModel}
          onEditConceptType={(conceptType) => {
            clearFormErrors()
            handleEditConceptType(conceptType)
          }}
          onDeleteConceptType={removeConceptType}
          movingConceptTypeId={movingConceptTypeId}
          onMoveConceptType={moveConceptTypeWithinParent}
          normalizingSiblingOrders={normalizingSiblingOrders}
          onNormalizeSiblingOrders={normalizeSiblingOrders}
        />
      )}

      {message ? <p className="message ok">{message}</p> : null}
      {error ? <p className="message error">{error}</p> : null}
    </main>
  )
}

export default App
