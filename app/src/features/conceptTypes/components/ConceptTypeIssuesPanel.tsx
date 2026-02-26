import type { ConceptTypeRecord } from '../csv/types'
import type { ConceptTypeIssueSummary } from '../types/issues'

type ConceptTypeIssuesPanelProps = {
  issueSummary: ConceptTypeIssueSummary
  conceptById: Map<string, ConceptTypeRecord>
  showIssuesOnly: boolean
  onToggleShowIssuesOnly: (value: boolean) => void
  onJumpToWhereUsed: (conceptTypeId: string) => void
  onEdit: (conceptType: ConceptTypeRecord) => void
  normalizingSiblingOrders: boolean
  onNormalizeSiblingOrders: () => void
}

export function ConceptTypeIssuesPanel({
  issueSummary,
  conceptById,
  showIssuesOnly,
  onToggleShowIssuesOnly,
  onJumpToWhereUsed,
  onEdit,
  normalizingSiblingOrders,
  onNormalizeSiblingOrders,
}: ConceptTypeIssuesPanelProps) {
  return (
    <div className="issuesPanel">
      <p className="issuesTitle">Find issues</p>
      <p className="meta">
        Orphan PartOf: {issueSummary.orphanPartOf.length} | Broken ReferenceTo: {issueSummary.brokenReferenceTo.length}
        {' | '}Sibling order issues: {issueSummary.siblingOrderIssueParents.length}
      </p>
      {issueSummary.totalIssueCount === 0 ? (
        <p className="meta">No issues found.</p>
      ) : (
        <>
          {issueSummary.orphanPartOf.length > 0 ? (
            <div className="issueExampleGroup">
              <p className="meta">Orphan PartOf examples:</p>
              {issueSummary.orphanPartOf.slice(0, 3).map((item) => (
                <div key={`orphan-${item.id}`} className="issueExampleRow">
                  <span className="meta">{item.name}</span>
                  <div className="actions">
                    <button type="button" onClick={() => onJumpToWhereUsed(item.id)}>
                      Where used
                    </button>
                    <button type="button" onClick={() => onEdit(item)}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {issueSummary.brokenReferenceTo.length > 0 ? (
            <div className="issueExampleGroup">
              <p className="meta">Broken ReferenceTo examples:</p>
              {issueSummary.brokenReferenceTo.slice(0, 3).map((item) => (
                <div key={`broken-ref-${item.id}`} className="issueExampleRow">
                  <span className="meta">{item.name}</span>
                  <div className="actions">
                    <button type="button" onClick={() => onJumpToWhereUsed(item.id)}>
                      Where used
                    </button>
                    <button type="button" onClick={() => onEdit(item)}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {issueSummary.siblingOrderIssueParents.length > 0 ? (
            <div className="issueExampleGroup">
              <p className="meta">Sibling order issue parents:</p>
              {issueSummary.siblingOrderIssueParents.slice(0, 3).map((item) => {
                const parent = conceptById.get(item.parentId)

                return (
                  <div key={`parent-order-${item.parentId}`} className="issueExampleRow">
                    <span className="meta">
                      {item.parentName} ({item.issueCount})
                    </span>
                    <div className="actions">
                      {parent ? (
                        <button type="button" onClick={() => onJumpToWhereUsed(parent.id)}>
                          Where used
                        </button>
                      ) : null}
                      {parent ? (
                        <button type="button" onClick={() => onEdit(parent)}>
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
          {issueSummary.siblingOrderIssueParents.length > 0 ? (
            <div className="actions">
              <button type="button" onClick={onNormalizeSiblingOrders} disabled={normalizingSiblingOrders}>
                {normalizingSiblingOrders ? 'Normalizing...' : 'Fix sibling order issues'}
              </button>
            </div>
          ) : null}
          <label className="inlineToggle">
            <input
              type="checkbox"
              checked={showIssuesOnly}
              onChange={(event) => onToggleShowIssuesOnly(event.target.checked)}
            />
            View only affected items
          </label>
        </>
      )}
    </div>
  )
}
