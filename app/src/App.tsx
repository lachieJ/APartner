import { useState } from 'react'
import { useAuthSession } from './features/conceptTypes/hooks/useAuthSession'
import { useAuthActions } from './features/conceptTypes/hooks/useAuthActions'
import { useConceptTypeFormState } from './features/conceptTypes/hooks/useConceptTypeFormState'
import { useConceptTypeImport } from './features/conceptTypes/hooks/useConceptTypeImport'
import { useModelManagement } from './features/conceptTypes/hooks/useModelManagement'
import { useConceptTypeUiHandlers } from './features/conceptTypes/hooks/useConceptTypeUiHandlers'
import { useConceptTypes } from './features/conceptTypes/hooks/useConceptTypes'
import { useAuthenticatedConceptTypeWorkspace } from './features/conceptTypes/hooks/useAuthenticatedConceptTypeWorkspace'
import { useStatusMessage } from './features/conceptTypes/hooks/useStatusMessage'
import { AuthenticatedConceptTypeView } from './features/conceptTypes/components/AuthenticatedConceptTypeView'
import { SignInPanel } from './features/conceptTypes/components/SignInPanel'
import type { ConceptTypeFormErrors } from './features/conceptTypes/types/form'
import './App.css'

function App() {
  const { session, email, setEmail, sendMagicLink: sendMagicLinkRequest, signOut: signOutRequest } =
    useAuthSession()
  const { message, error, setMessage, setError, clearStatus } = useStatusMessage()
  const [formErrors, setFormErrors] = useState<ConceptTypeFormErrors>({})

  const clearFormErrors = () => setFormErrors({})

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
      createConceptTypeFromPayload,
      updateConceptTypeFromPayload,
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

  const workspace = useAuthenticatedConceptTypeWorkspace({
    formErrors,
    setFormErrors,
    clearFormErrors,
    handleFormCancel,
    handleEditConceptType,
    editingId,
    name,
    description,
    partOfConceptTypeId,
    partOrder,
    referenceToConceptTypeId,
    conceptTypeOptions,
    setName,
    setDescription,
    setPartOfConceptTypeId,
    setPartOrder,
    setReferenceToConceptTypeId,
    onSubmitConceptType: submitConceptType,
    onCreateConceptTypeFromPayload: createConceptTypeFromPayload,
    onUpdateConceptTypeFromPayload: updateConceptTypeFromPayload,
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
    onPreviewImportConceptTypes: previewImportConceptTypes,
    onImportConceptTypes: importConceptTypes,
    onDownloadSampleCsv: downloadSampleCsv,
    onExportConceptTypes: exportConceptTypes,
    onClearImportFields: clearImportFields,
    onDownloadImportErrorsCsv: downloadImportErrorsCsv,
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
    onResetModel: resetModel,
    onDeleteStructure: deleteStructure,
    onPurgeModel: purgeModel,
    onDeleteConceptType: removeConceptType,
    movingConceptTypeId,
    onMoveConceptType: moveConceptTypeWithinParent,
    normalizingSiblingOrders,
    onNormalizeSiblingOrders: normalizeSiblingOrders,
  })

  return (
    <main className="page">
      <header className="header">
        <h1>MetaModel and ConceptModel Management</h1>
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
        <AuthenticatedConceptTypeView isAuthenticated={Boolean(session)} workspace={workspace} />
      )}

      {message ? <p className="message ok">{message}</p> : null}
      {error ? <p className="message error">{error}</p> : null}
    </main>
  )
}

export default App
