import type { ConceptRemediationAuditRecord } from '../data/conceptService'

type ConceptAuditPanelProps = {
  audits: ConceptRemediationAuditRecord[]
  loading: boolean
  onRefresh: () => void
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export function ConceptAuditPanel({ audits, loading, onRefresh }: ConceptAuditPanelProps) {
  return (
    <section className="card">
      <div className="actions">
        <h2>Remediation Audit</h2>
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? <p>Loading audit entries...</p> : null}
      {!loading && audits.length === 0 ? <p>No remediation audits yet.</p> : null}

      {!loading
        ? audits.map((entry) => (
            <article key={entry.id} className="row">
              <div>
                <h3>{entry.action_kind}</h3>
                <p className="meta">
                  At: {formatDateTime(entry.created_at)} | By: {entry.created_by}
                </p>
                <p className="meta">
                  Cleared PartOf: {entry.part_of_cleared_count} | Cleared ReferenceTo: {entry.reference_to_cleared_count}{' '}
                  | Affected concepts: {entry.affected_concept_ids.length}
                </p>
                {entry.reason ? <p className="meta">Reason: {entry.reason}</p> : null}
              </div>
            </article>
          ))
        : null}
    </section>
  )
}
