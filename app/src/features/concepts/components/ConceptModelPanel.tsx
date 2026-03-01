import { useCallback, useEffect, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import { listConceptRemediationAudits, type ConceptRemediationAuditRecord } from '../data/conceptService'
import { ConceptAuditPanel } from './ConceptAuditPanel'
import { ConceptEditorSection } from './ConceptEditorSection'
import { MaintainConceptBuilder } from './MaintainConceptBuilder'
import { useConceptImport } from '../hooks/useConceptImport'
import { ConceptImportPanel } from './ConceptImportPanel'
import { ConceptModelsSection } from './ConceptModelsSection'
import { useConcepts } from '../hooks/useConcepts'

type ConceptModelPanelProps = {
  isAuthenticated: boolean
  conceptTypes: ConceptTypeRecord[]
}

export function ConceptModelPanel({ isAuthenticated, conceptTypes }: ConceptModelPanelProps) {
  const {
    concepts,
    conceptOptions,
    reloadConcepts,
    loading,
    submitting,
    editingId,
    name,
    description,
    conceptTypeId,
    partOfConceptId,
    partOrder,
    referenceToConceptId,
    message,
    error,
    setName,
    setDescription,
    setConceptTypeId,
    setPartOfConceptId,
    setPartOrder,
    setReferenceToConceptId,
    setError,
    setMessage,
    createConceptFromPayload,
    updateConceptFromPayload,
    submitConcept,
    editConcept,
    removeConcept,
    clearPartOfForConcept,
    clearReferenceToForConcept,
    clearPartOfForConceptsBulk,
    clearReferenceToForConceptsBulk,
    runSafeAutoFix,
    moveConceptWithinParent,
    normalizeConceptSiblingOrders,
    resetForm,
  } = useConcepts({ isAuthenticated })

  const {
    importCsvText,
    setImportCsvText,
    importing,
    importSummary,
    importFileName,
    importFileError,
    onImportFileSelected,
    importConcepts,
    exportConcepts,
    downloadSampleCsv,
    downloadImportErrorsCsv,
    clearImportFields,
    clearFileStatus,
  } = useConceptImport({
    concepts,
    conceptTypes,
    reloadConcepts,
    setMessage,
    setError,
  })

  const [audits, setAudits] = useState<ConceptRemediationAuditRecord[]>([])
  const [auditsLoading, setAuditsLoading] = useState(false)

  const loadAudits = useCallback(async () => {
    if (!isAuthenticated) {
      setAudits([])
      return
    }

    setAuditsLoading(true)
    const result = await listConceptRemediationAudits(25)
    if (result.error) {
      setError(result.error)
      setAuditsLoading(false)
      return
    }

    setAudits(result.data)
    setAuditsLoading(false)
  }, [isAuthenticated, setError])

  useEffect(() => {
    void loadAudits()
  }, [loadAudits])

  const handleDeleteConcept = (id: string) => {
    if (window.confirm('Delete this concept?')) {
      void removeConcept(id)
    }
  }

  return (
    <>
      <MaintainConceptBuilder
        conceptTypes={conceptTypes}
        concepts={concepts}
        onCreateConcept={async (payload) => {
          return createConceptFromPayload(payload, 'Concept created via guided builder.')
        }}
      />

      <ConceptEditorSection
        editingId={editingId}
        submitting={submitting}
        name={name}
        description={description}
        conceptTypeId={conceptTypeId}
        partOfConceptId={partOfConceptId}
        partOrder={partOrder}
        referenceToConceptId={referenceToConceptId}
        conceptTypes={conceptTypes}
        conceptOptions={conceptOptions}
        onSetName={setName}
        onSetDescription={setDescription}
        onSetConceptTypeId={setConceptTypeId}
        onSetPartOfConceptId={setPartOfConceptId}
        onSetPartOrder={setPartOrder}
        onSetReferenceToConceptId={setReferenceToConceptId}
        onClearError={() => setError(null)}
        onSubmit={submitConcept}
        onReset={resetForm}
      />

      <section className="card">
        <h2>Concept Import & Export</h2>
        <ConceptImportPanel
          importCsvText={importCsvText}
          setImportCsvText={setImportCsvText}
          importFileName={importFileName}
          importFileError={importFileError}
          importing={importing}
          hasConcepts={concepts.length > 0}
          onImportFileSelected={onImportFileSelected}
          onImport={importConcepts}
          onDownloadSampleCsv={downloadSampleCsv}
          onExportCsv={exportConcepts}
          onClear={clearImportFields}
          onDownloadImportErrorsCsv={downloadImportErrorsCsv}
          clearFileStatus={clearFileStatus}
          importSummary={importSummary}
        />
      </section>

      <ConceptModelsSection
        concepts={concepts}
        conceptTypes={conceptTypes}
        loading={loading}
        onCreateConcept={(payload) => createConceptFromPayload(payload, 'Concept created via compact view.')}
        onUpdateConcept={(id, payload) => updateConceptFromPayload(id, payload, 'Concept updated via compact view.')}
        onEditConcept={editConcept}
        onDeleteConcept={handleDeleteConcept}
        onMoveConceptWithinParent={moveConceptWithinParent}
        onNormalizeConceptSiblingOrders={normalizeConceptSiblingOrders}
        onClearPartOfForConcept={clearPartOfForConcept}
        onClearReferenceToForConcept={clearReferenceToForConcept}
        onClearPartOfForConceptsBulk={clearPartOfForConceptsBulk}
        onClearReferenceToForConceptsBulk={clearReferenceToForConceptsBulk}
        onRunSafeAutoFix={runSafeAutoFix}
        onRefreshAudits={loadAudits}
      />

      <ConceptAuditPanel audits={audits} loading={auditsLoading} onRefresh={() => void loadAudits()} />

      {message ? <p className="message ok">{message}</p> : null}
      {error ? <p className="message error">{error}</p> : null}
    </>
  )
}
