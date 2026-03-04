import type { ConceptModelViewMode } from '../hooks/useConceptModelViewState'

type ConceptModelViewControlsStatusProps = {
  viewMode: ConceptModelViewMode
  onSetViewMode: (mode: ConceptModelViewMode) => void
  onNormalizeConceptSiblingOrders: () => Promise<void>
  loading: boolean
  conceptCount: number
  showIssuesOnly: boolean
  displayedConceptCount: number
}

export function ConceptModelViewControlsStatus({
  viewMode,
  onSetViewMode,
  onNormalizeConceptSiblingOrders,
  loading,
  conceptCount,
  showIssuesOnly,
  displayedConceptCount,
}: ConceptModelViewControlsStatusProps) {
  return (
    <>
      <div className="viewControls">
        <label>
          View
          <select value={viewMode} onChange={(event) => onSetViewMode(event.target.value as ConceptModelViewMode)}>
            <option value="flat">Flat list</option>
            <option value="tree">Tree by PartOf</option>
            <option value="compact">Compact tree</option>
            <option value="value-stream">Value Stream maintenance</option>
          </select>
        </label>
        <div className="actions">
          <button type="button" onClick={() => void onNormalizeConceptSiblingOrders()}>
            Normalize sibling orders
          </button>
        </div>
      </div>
      {loading ? <p>Loading...</p> : null}
      {!loading && conceptCount === 0 ? <p>No concepts yet.</p> : null}
      {!loading && conceptCount > 0 && showIssuesOnly && displayedConceptCount === 0 ? (
        <p className="hint">No concepts match the current diagnostics filter.</p>
      ) : null}
    </>
  )
}