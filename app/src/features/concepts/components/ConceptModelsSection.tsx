import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptPayload, ConceptRecord } from '../types'
import { ConceptListRow } from './ConceptListRow'
import { ConceptModelViewControlsStatus } from './ConceptModelViewControlsStatus'
import { ConceptCompactView } from './ConceptCompactView'
import { ConceptIssuesPanel } from './ConceptIssuesPanel'
import { ConceptTreeView } from './ConceptTreeView'
import { ConceptValueStreamWindow } from './ConceptValueStreamWindow'
import { useConceptModelViewState } from '../hooks/useConceptModelViewState'
import { useConceptRemediationActions } from '../hooks/useConceptRemediationActions'

type ConceptModelsSectionProps = {
  concepts: ConceptRecord[]
  conceptTypes: ConceptTypeRecord[]
  loading: boolean
  onCreateConcept: (payload: ConceptPayload) => Promise<boolean>
  onUpdateConcept: (id: string, payload: ConceptPayload) => Promise<boolean>
  onEditConcept: (concept: ConceptRecord) => void
  onDeleteConcept: (id: string) => void
  onCopyConceptModelFromRoot: (rootConceptId: string) => Promise<void>
  movingConceptId: string | null
  onMoveConceptWithinParent: (id: string, direction: 'up' | 'down') => Promise<void>
  onNormalizeConceptSiblingOrders: () => Promise<void>
  normalizingSiblingOrders: boolean
  onClearPartOfForConcept: (id: string) => Promise<void>
  onClearReferenceToForConcept: (id: string) => Promise<void>
  onClearPartOfForConceptsBulk: (ids: string[]) => Promise<void>
  onClearReferenceToForConceptsBulk: (ids: string[]) => Promise<void>
  onRunSafeAutoFix: (partOfIds: string[], referenceToIds: string[], reason?: string) => Promise<void>
  onRefreshAudits: () => Promise<void>
}

export function ConceptModelsSection({
  concepts,
  conceptTypes,
  loading,
  onCreateConcept,
  onUpdateConcept,
  onEditConcept,
  onDeleteConcept,
  onCopyConceptModelFromRoot,
  movingConceptId,
  onMoveConceptWithinParent,
  onNormalizeConceptSiblingOrders,
  normalizingSiblingOrders,
  onClearPartOfForConcept,
  onClearReferenceToForConcept,
  onClearPartOfForConceptsBulk,
  onClearReferenceToForConceptsBulk,
  onRunSafeAutoFix,
  onRefreshAudits,
}: ConceptModelsSectionProps) {
  const {
    viewMode,
    setViewMode,
    showIssuesOnly,
    setShowIssuesOnly,
    conceptTypeById,
    conceptById,
    issueSummary,
    displayedConcepts,
    conceptTypeNameById,
    childrenByParentId,
    rootConcepts,
  } = useConceptModelViewState({
    concepts,
    conceptTypes,
  })

  const {
    handleClearPartOfLink,
    handleClearReferenceToLink,
    handleClearPartOfLinksBulk,
    handleClearReferenceToLinksBulk,
    handleApplySafeAutoFix,
  } = useConceptRemediationActions({
    onClearPartOfForConcept,
    onClearReferenceToForConcept,
    onClearPartOfForConceptsBulk,
    onClearReferenceToForConceptsBulk,
    onRunSafeAutoFix,
    onRefreshAudits,
  })

  return (
    <section className="card">
      <h2>Concept Models</h2>
      <ConceptIssuesPanel
        issueSummary={issueSummary}
        conceptTypeById={conceptTypeById}
        showIssuesOnly={showIssuesOnly}
        onToggleShowIssuesOnly={setShowIssuesOnly}
        onEdit={onEditConcept}
        onClearPartOfLink={(id) => void handleClearPartOfLink(id)}
        onClearReferenceToLink={(id) => void handleClearReferenceToLink(id)}
        onClearPartOfLinksBulk={(ids) => void handleClearPartOfLinksBulk(ids)}
        onClearReferenceToLinksBulk={(ids) => void handleClearReferenceToLinksBulk(ids)}
        onApplySafeAutoFix={(partOfIds, referenceToIds) => void handleApplySafeAutoFix(partOfIds, referenceToIds)}
      />
      <ConceptModelViewControlsStatus
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        onNormalizeConceptSiblingOrders={onNormalizeConceptSiblingOrders}
        loading={loading}
        conceptCount={concepts.length}
        showIssuesOnly={showIssuesOnly}
        displayedConceptCount={displayedConcepts.length}
      />

      {!loading && viewMode === 'flat'
        ? displayedConcepts.map((concept) => (
            <ConceptListRow
              key={concept.id}
              concept={concept}
              conceptTypeNameById={conceptTypeNameById}
              conceptById={conceptById}
              onEditConcept={onEditConcept}
              onDeleteConcept={onDeleteConcept}
            />
          ))
        : null}

      {!loading && viewMode === 'tree' ? (
        <ConceptTreeView
          rootConcepts={rootConcepts}
          conceptById={conceptById}
          childrenByParentId={childrenByParentId}
          conceptTypeNameById={conceptTypeNameById}
          onMoveConceptWithinParent={onMoveConceptWithinParent}
          onEditConcept={onEditConcept}
          onDeleteConcept={onDeleteConcept}
        />
      ) : null}

      {viewMode === 'compact' ? (
        <ConceptCompactView
          concepts={displayedConcepts}
          conceptTypes={conceptTypes}
          conceptTypeById={conceptTypeById}
          conceptById={conceptById}
          onCreateConcept={onCreateConcept}
          onUpdateConcept={onUpdateConcept}
          onDeleteConcept={onDeleteConcept}
          onCopyConceptModelFromRoot={onCopyConceptModelFromRoot}
          movingConceptId={movingConceptId}
          onMoveConceptWithinParent={onMoveConceptWithinParent}
          onNormalizeSiblingOrders={onNormalizeConceptSiblingOrders}
          disableNormalizeSiblingOrders={loading || normalizingSiblingOrders}
          disableCopyConceptModel={loading || normalizingSiblingOrders || Boolean(movingConceptId)}
        />
      ) : null}

      {viewMode === 'value-stream' ? (
        <ConceptValueStreamWindow
          concepts={displayedConcepts}
          conceptTypes={conceptTypes}
          conceptTypeById={conceptTypeById}
          conceptById={conceptById}
          onCreateConcept={onCreateConcept}
          onUpdateConcept={onUpdateConcept}
          onDeleteConcept={onDeleteConcept}
          movingConceptId={movingConceptId}
          onMoveConceptWithinParent={onMoveConceptWithinParent}
          onNormalizeSiblingOrders={onNormalizeConceptSiblingOrders}
        />
      ) : null}
    </section>
  )
}