import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import type { ConceptRecord } from '../types'
import { ConceptListRow } from './ConceptListRow'
import { ConceptModelViewControlsStatus } from './ConceptModelViewControlsStatus'
import { ConceptIssuesPanel } from './ConceptIssuesPanel'
import { ConceptTreeView } from './ConceptTreeView'
import { useConceptModelViewState } from '../hooks/useConceptModelViewState'
import { useConceptRemediationActions } from '../hooks/useConceptRemediationActions'

type ConceptModelsSectionProps = {
  concepts: ConceptRecord[]
  conceptTypes: ConceptTypeRecord[]
  loading: boolean
  onEditConcept: (concept: ConceptRecord) => void
  onDeleteConcept: (id: string) => void
  onMoveConceptWithinParent: (id: string, direction: 'up' | 'down') => Promise<void>
  onNormalizeConceptSiblingOrders: () => Promise<void>
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
  onEditConcept,
  onDeleteConcept,
  onMoveConceptWithinParent,
  onNormalizeConceptSiblingOrders,
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
              onMoveConceptWithinParent={onMoveConceptWithinParent}
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
          onEditConcept={onEditConcept}
          onDeleteConcept={onDeleteConcept}
        />
      ) : null}
    </section>
  )
}