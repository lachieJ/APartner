import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import { listConceptRemediationAudits, type ConceptRemediationAuditRecord } from '../data/conceptService'
import { ConceptAuditPanel } from './ConceptAuditPanel'
import { MaintainConceptBuilder } from './MaintainConceptBuilder'
import { useConceptImport } from '../hooks/useConceptImport'
import { ConceptImportPanel } from './ConceptImportPanel'
import { ConceptIssuesPanel } from './ConceptIssuesPanel'
import { ConceptTreeNode } from './ConceptTreeNode'
import { useConcepts } from '../hooks/useConcepts'
import { buildConceptIssueSummary, getAffectedConceptIds } from '../utils/conceptDiagnostics'

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

  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat')
  const [showIssuesOnly, setShowIssuesOnly] = useState(false)
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

  const conceptTypeById = useMemo(() => new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType])), [conceptTypes])
  const conceptById = useMemo(() => new Map(concepts.map((concept) => [concept.id, concept])), [concepts])
  const issueSummary = useMemo(() => buildConceptIssueSummary(concepts, conceptTypes), [concepts, conceptTypes])
  const affectedConceptIds = useMemo(() => getAffectedConceptIds(issueSummary), [issueSummary])
  const displayedConcepts = useMemo(() => {
    if (!showIssuesOnly) {
      return concepts
    }

    return concepts.filter((concept) => affectedConceptIds.has(concept.id))
  }, [affectedConceptIds, concepts, showIssuesOnly])
  const conceptTypeNameById = useMemo(
    () => new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType.name])),
    [conceptTypes],
  )
  const childrenByParentId = useMemo(() => {
    const children = new Map<string, typeof displayedConcepts>()
    for (const concept of displayedConcepts) {
      if (!concept.part_of_concept_id) {
        continue
      }

      const siblings = children.get(concept.part_of_concept_id) ?? []
      siblings.push(concept)
      children.set(concept.part_of_concept_id, siblings)
    }

    for (const [parentId, siblings] of children) {
      siblings.sort((left, right) => {
        const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
        const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder
        }

        return left.name.localeCompare(right.name)
      })
      children.set(parentId, siblings)
    }

    return children
  }, [displayedConcepts])

  const rootConcepts = useMemo(
    () =>
      displayedConcepts
        .filter((concept) => !concept.part_of_concept_id || !conceptById.has(concept.part_of_concept_id))
        .sort((left, right) => {
          const leftOrder = left.part_order ?? Number.MAX_SAFE_INTEGER
          const rightOrder = right.part_order ?? Number.MAX_SAFE_INTEGER
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder
          }

          return left.name.localeCompare(right.name)
        }),
    [conceptById, displayedConcepts],
  )

  const handleDeleteConcept = (id: string) => {
    if (window.confirm('Delete this concept?')) {
      void removeConcept(id)
    }
  }

  const handleClearPartOfLink = async (id: string) => {
    if (window.confirm('Clear PartOf link for this concept?')) {
      await clearPartOfForConcept(id)
      await loadAudits()
    }
  }

  const handleClearReferenceToLink = async (id: string) => {
    if (window.confirm('Clear ReferenceTo link for this concept?')) {
      await clearReferenceToForConcept(id)
      await loadAudits()
    }
  }

  const handleClearPartOfLinksBulk = async (ids: string[]) => {
    if (ids.length === 0) {
      return
    }

    if (window.confirm(`Clear PartOf links for ${ids.length} concept(s)?`)) {
      await clearPartOfForConceptsBulk(ids)
      await loadAudits()
    }
  }

  const handleClearReferenceToLinksBulk = async (ids: string[]) => {
    if (ids.length === 0) {
      return
    }

    if (window.confirm(`Clear ReferenceTo links for ${ids.length} concept(s)?`)) {
      await clearReferenceToForConceptsBulk(ids)
      await loadAudits()
    }
  }

  const handleApplySafeAutoFix = async (partOfIds: string[], referenceToIds: string[]) => {
    const uniquePartOfIds = Array.from(new Set(partOfIds))
    const uniqueReferenceToIds = Array.from(new Set(referenceToIds))

    if (uniquePartOfIds.length === 0 && uniqueReferenceToIds.length === 0) {
      return
    }

    const confirmed = window.confirm(
      [
        'Apply safe auto-fix?',
        `- PartOf links to clear: ${uniquePartOfIds.length}`,
        `- ReferenceTo links to clear: ${uniqueReferenceToIds.length}`,
      ].join('\n'),
    )

    if (!confirmed) {
      return
    }

    const reasonInput = window.prompt('Optional remediation reason for audit log:', 'Safe auto-fix from diagnostics')
    const reason = reasonInput === null ? undefined : reasonInput

    await runSafeAutoFix(uniquePartOfIds, uniqueReferenceToIds, reason)
    await loadAudits()
  }

  const selectablePartOfConcepts = conceptOptions.filter(
    (option) => option.id !== editingId && option.conceptTypeId === conceptTypeById.get(conceptTypeId)?.part_of_concept_type_id,
  )

  const selectableReferenceConcepts = conceptOptions.filter(
    (option) =>
      option.id !== editingId &&
      option.conceptTypeId === conceptTypeById.get(conceptTypeId)?.reference_to_concept_type_id,
  )

  return (
    <>
      <MaintainConceptBuilder
        conceptTypes={conceptTypes}
        concepts={concepts}
        onCreateConcept={async (payload) => {
          return createConceptFromPayload(payload, 'Concept created via guided builder.')
        }}
      />

      <section className="card">
        <h2>{editingId ? 'Edit Concept' : 'Create Concept'}</h2>
        <form onSubmit={submitConcept} className="formGrid">
          <label>
            Name
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder="Enter concept name"
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
            />
          </label>

          <label>
            ConceptType
            <select
              value={conceptTypeId}
              onChange={(event) => {
                setConceptTypeId(event.target.value)
                setPartOfConceptId('')
                setReferenceToConceptId('')
              }}
            >
              <option value="">(select)</option>
              {conceptTypes.map((conceptType) => (
                <option key={conceptType.id} value={conceptType.id}>
                  {conceptType.name} ({conceptType.id})
                </option>
              ))}
            </select>
            <span className="hint">Required. This determines allowable PartOf/ReferenceTo targets.</span>
          </label>

          <label>
            Part Of Concept
            <select
              value={partOfConceptId}
              onChange={(event) => {
                setPartOfConceptId(event.target.value)
                setError(null)
              }}
              disabled={!conceptTypeId || selectablePartOfConcepts.length === 0}
            >
              <option value="">(none)</option>
              {selectablePartOfConcepts.map((concept) => (
                <option key={concept.id} value={concept.id}>
                  {concept.name} ({concept.id})
                </option>
              ))}
            </select>
            <span className="hint">Options are filtered to the parent ConceptType required by this ConceptType.</span>
          </label>

          <label>
            Order Within Parent
            <input
              type="number"
              min={1}
              step={1}
              value={partOrder}
              onChange={(event) => {
                setPartOrder(event.target.value)
                setError(null)
              }}
              placeholder="1"
              disabled={!partOfConceptId}
            />
            <span className="hint">Optional ordering among siblings under the selected parent concept.</span>
          </label>

          <label>
            Reference To Concept
            <select
              value={referenceToConceptId}
              onChange={(event) => {
                setReferenceToConceptId(event.target.value)
                setError(null)
              }}
              disabled={!conceptTypeId || selectableReferenceConcepts.length === 0}
            >
              <option value="">(none)</option>
              {selectableReferenceConcepts.map((concept) => (
                <option key={concept.id} value={concept.id}>
                  {concept.name} ({concept.id})
                </option>
              ))}
            </select>
            <span className="hint">Options are filtered to the reference ConceptType declared by this ConceptType.</span>
          </label>

          <div className="actions">
            <button type="submit" disabled={submitting || conceptTypes.length === 0}>
              {submitting ? 'Saving...' : editingId ? 'Save' : 'Create'}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
          {conceptTypes.length === 0 ? (
            <span className="hint">Create ConceptTypes first, then create Concepts that conform to those semantics.</span>
          ) : null}
        </form>
      </section>

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

      <section className="card">
        <h2>Concept Models</h2>
        <ConceptIssuesPanel
          issueSummary={issueSummary}
          conceptTypeById={conceptTypeById}
          showIssuesOnly={showIssuesOnly}
          onToggleShowIssuesOnly={setShowIssuesOnly}
          onEdit={editConcept}
          onClearPartOfLink={(id) => void handleClearPartOfLink(id)}
          onClearReferenceToLink={(id) => void handleClearReferenceToLink(id)}
          onClearPartOfLinksBulk={(ids) => void handleClearPartOfLinksBulk(ids)}
          onClearReferenceToLinksBulk={(ids) => void handleClearReferenceToLinksBulk(ids)}
          onApplySafeAutoFix={(partOfIds, referenceToIds) => void handleApplySafeAutoFix(partOfIds, referenceToIds)}
        />
        <div className="viewControls">
          <label>
            View
            <select value={viewMode} onChange={(event) => setViewMode(event.target.value as 'flat' | 'tree')}>
              <option value="flat">Flat list</option>
              <option value="tree">Tree by PartOf</option>
            </select>
          </label>
          <div className="actions">
            <button type="button" onClick={() => void normalizeConceptSiblingOrders()}>
              Normalize sibling orders
            </button>
          </div>
        </div>
        {loading ? <p>Loading...</p> : null}
        {!loading && concepts.length === 0 ? <p>No concepts yet.</p> : null}
        {!loading && concepts.length > 0 && showIssuesOnly && displayedConcepts.length === 0 ? (
          <p className="hint">No concepts match the current diagnostics filter.</p>
        ) : null}

        {!loading && viewMode === 'flat'
          ? displayedConcepts.map((concept) => (
              <article key={concept.id} className="row">
                <div>
                  <h3>{concept.name}</h3>
                  {concept.description ? <p>{concept.description}</p> : null}
                  <p className="meta">
                    Type: {conceptTypeNameById.get(concept.concept_type_id) ?? concept.concept_type_id}
                    {concept.part_of_concept_id
                      ? ` | PartOf: ${conceptById.get(concept.part_of_concept_id)?.name ?? concept.part_of_concept_id}`
                      : ''}
                    {concept.part_order !== null ? ` | PartOrder: ${concept.part_order}` : ''}
                    {concept.reference_to_concept_id
                      ? ` | RefTo: ${conceptById.get(concept.reference_to_concept_id)?.name ?? concept.reference_to_concept_id}`
                      : ''}
                  </p>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    onClick={() => void moveConceptWithinParent(concept.id, 'up')}
                    disabled={!concept.part_of_concept_id}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveConceptWithinParent(concept.id, 'down')}
                    disabled={!concept.part_of_concept_id}
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => editConcept(concept)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDeleteConcept(concept.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))
          : null}

        {!loading && viewMode === 'tree' ? (
          rootConcepts.length > 0 ? (
            <ul className="treeList">
              {rootConcepts.map((rootConcept) => (
                <ConceptTreeNode
                  key={rootConcept.id}
                  concept={rootConcept}
                  conceptById={conceptById}
                  childrenByParentId={childrenByParentId}
                  conceptTypeNameById={conceptTypeNameById}
                  visited={new Set()}
                  onEdit={editConcept}
                  onDelete={handleDeleteConcept}
                />
              ))}
            </ul>
          ) : (
            <p className="hint">No root concepts found. Switch to flat view to inspect the current dataset.</p>
          )
        ) : null}
      </section>

      <ConceptAuditPanel audits={audits} loading={auditsLoading} onRefresh={() => void loadAudits()} />

      {message ? <p className="message ok">{message}</p> : null}
      {error ? <p className="message error">{error}</p> : null}
    </>
  )
}
