import { useCallback, useEffect, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import { listConceptRemediationAudits, type ConceptRemediationAuditRecord } from '../data/conceptService'
import { ConceptAuditPanel } from './ConceptAuditPanel'
import { ConceptEditorSection } from './ConceptEditorSection'
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
    copyConceptModelFromRoot,
    clearPartOfForConcept,
    clearReferenceToForConcept,
    clearPartOfForConceptsBulk,
    clearReferenceToForConceptsBulk,
    runSafeAutoFix,
    movingConceptId,
    moveConceptWithinParent,
    normalizeConceptSiblingOrders,
    normalizingSiblingOrders,
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
  const [activeTab, setActiveTab] = useState<'edit' | 'models' | 'import' | 'audits'>(() => {
    const stored = window.localStorage.getItem('concept.activeTab')
    if (stored === 'edit' || stored === 'models' || stored === 'import' || stored === 'audits') {
      return stored
    }
    return 'models'
  })

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

  useEffect(() => {
    window.localStorage.setItem('concept.activeTab', activeTab)
  }, [activeTab])

  const handleDeleteConcept = (id: string) => {
    if (window.confirm('Delete this concept?')) {
      void removeConcept(id)
    }
  }

  const handleEditConcept = (...args: Parameters<typeof editConcept>) => {
    editConcept(...args)
    setActiveTab('edit')
  }

  const handleDeleteEditedConcept = () => {
    if (!editingId) {
      return
    }

    handleDeleteConcept(editingId)
  }

  return (
    <>
      <div className="stickyToolbar">
        <div className="tabRow" role="tablist" aria-label="Concept maintenance sections">
          <button
            type="button"
            className={activeTab === 'models' ? 'tabButton active' : 'tabButton'}
            onClick={() => setActiveTab('models')}
          >
            Concept Models
          </button>
          <button
            type="button"
            className={activeTab === 'edit' ? 'tabButton active' : 'tabButton'}
            onClick={() => setActiveTab('edit')}
          >
            Concept Editor
          </button>
          <button
            type="button"
            className={activeTab === 'import' ? 'tabButton active' : 'tabButton'}
            onClick={() => setActiveTab('import')}
          >
            Concept Import/Export
          </button>
          <button
            type="button"
            className={activeTab === 'audits' ? 'tabButton active' : 'tabButton'}
            onClick={() => setActiveTab('audits')}
          >
            Remediation Audits
          </button>
        </div>
        <p className="hint">
          {activeTab === 'models'
            ? 'Inspect and maintain concept instances using flat, tree, and compact model views.'
            : activeTab === 'edit'
              ? 'Create or update a single concept with PartOf and ReferenceTo semantics.'
              : activeTab === 'import'
                ? 'Import or export concept instances via CSV, including no-ID imports using rootConceptName when unique.'
                : 'Review recent remediation and auto-fix audit events.'}
        </p>
      </div>

      {activeTab === 'edit' ? (
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
          onDelete={handleDeleteEditedConcept}
        />
      ) : null}

      {activeTab === 'import' ? (
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
      ) : null}

      {activeTab === 'models' ? (
        <ConceptModelsSection
          concepts={concepts}
          conceptTypes={conceptTypes}
          loading={loading}
          onCreateConcept={(payload) => createConceptFromPayload(payload, 'Concept created via compact view.')}
          onUpdateConcept={(id, payload) => updateConceptFromPayload(id, payload, 'Concept updated via compact view.')}
          onEditConcept={handleEditConcept}
          onDeleteConcept={handleDeleteConcept}
          onCopyConceptModelFromRoot={copyConceptModelFromRoot}
          movingConceptId={movingConceptId}
          onMoveConceptWithinParent={moveConceptWithinParent}
          onNormalizeConceptSiblingOrders={normalizeConceptSiblingOrders}
          normalizingSiblingOrders={normalizingSiblingOrders}
          onClearPartOfForConcept={clearPartOfForConcept}
          onClearReferenceToForConcept={clearReferenceToForConcept}
          onClearPartOfForConceptsBulk={clearPartOfForConceptsBulk}
          onClearReferenceToForConceptsBulk={clearReferenceToForConceptsBulk}
          onRunSafeAutoFix={runSafeAutoFix}
          onRefreshAudits={loadAudits}
        />
      ) : null}

      {activeTab === 'audits' ? <ConceptAuditPanel audits={audits} loading={auditsLoading} onRefresh={() => void loadAudits()} /> : null}

      {message ? <p className="message ok">{message}</p> : null}
      {error ? <p className="message error">{error}</p> : null}
    </>
  )
}
