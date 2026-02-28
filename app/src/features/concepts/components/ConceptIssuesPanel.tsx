import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import type { ConceptRecord } from '../types'
import type { ConceptIssueSummary } from '../types/issues'

type ConceptIssuesPanelProps = {
  issueSummary: ConceptIssueSummary
  conceptTypeById: Map<string, ConceptTypeRecord>
  showIssuesOnly: boolean
  onToggleShowIssuesOnly: (value: boolean) => void
  onEdit: (concept: ConceptRecord) => void
  onClearPartOfLink: (conceptId: string) => void
  onClearReferenceToLink: (conceptId: string) => void
  onClearPartOfLinksBulk: (conceptIds: string[]) => void
  onClearReferenceToLinksBulk: (conceptIds: string[]) => void
  onApplySafeAutoFix: (partOfIds: string[], referenceToIds: string[]) => void
}

const EXAMPLE_LIMIT = 3

export function ConceptIssuesPanel({
  issueSummary,
  conceptTypeById,
  showIssuesOnly,
  onToggleShowIssuesOnly,
  onEdit,
  onClearPartOfLink,
  onClearReferenceToLink,
  onClearPartOfLinksBulk,
  onClearReferenceToLinksBulk,
  onApplySafeAutoFix,
}: ConceptIssuesPanelProps) {
  const safeAutoFixPartOfIds = Array.from(
    new Set([
      ...issueSummary.orphanPartOf.map((concept) => concept.id),
      ...issueSummary.invalidPartOfType.map((concept) => concept.id),
      ...issueSummary.partOfCycleNodes.map((concept) => concept.id),
    ]),
  )
  const safeAutoFixReferenceToIds = Array.from(
    new Set([
      ...issueSummary.brokenReferenceTo.map((concept) => concept.id),
      ...issueSummary.invalidReferenceToType.map((concept) => concept.id),
    ]),
  )

  return (
    <div className="issuesPanel">
      <p className="issuesTitle">Concept model diagnostics</p>
      <p className="meta">
        Orphan PartOf: {issueSummary.orphanPartOf.length} | Broken ReferenceTo: {issueSummary.brokenReferenceTo.length}
        {' | '}Invalid PartOf type: {issueSummary.invalidPartOfType.length} | Invalid ReferenceTo type:{' '}
        {issueSummary.invalidReferenceToType.length} | PartOf cycles: {issueSummary.partOfCycleNodes.length}
      </p>
      {issueSummary.totalIssueCount === 0 ? <p className="meta">No issues found.</p> : null}

      {issueSummary.totalIssueCount > 0 ? (
        <div className="issueExampleGroup">
          <p className="meta">
            Safe auto-fix preview: clear PartOf for {safeAutoFixPartOfIds.length} concept(s), clear ReferenceTo for{' '}
            {safeAutoFixReferenceToIds.length} concept(s).
          </p>
          <div className="actions">
            <button
              type="button"
              onClick={() => onApplySafeAutoFix(safeAutoFixPartOfIds, safeAutoFixReferenceToIds)}
              disabled={safeAutoFixPartOfIds.length === 0 && safeAutoFixReferenceToIds.length === 0}
            >
              Apply safe auto-fix
            </button>
          </div>
        </div>
      ) : null}

      {issueSummary.orphanPartOf.length > 0 ? (
        <div className="issueExampleGroup">
          <p className="meta">Orphan PartOf examples:</p>
          <div className="actions">
            <button
              type="button"
              onClick={() => onClearPartOfLinksBulk(issueSummary.orphanPartOf.map((concept) => concept.id))}
            >
              Clear all orphan PartOf links
            </button>
          </div>
          {issueSummary.orphanPartOf.slice(0, EXAMPLE_LIMIT).map((concept) => (
            <div key={`orphan-${concept.id}`} className="issueExampleRow">
              <span className="meta">
                {concept.name} ({conceptTypeById.get(concept.concept_type_id)?.name ?? concept.concept_type_id})
              </span>
              <div className="actions">
                <button type="button" onClick={() => onEdit(concept)}>
                  Edit
                </button>
                <button type="button" onClick={() => onClearPartOfLink(concept.id)}>
                  Clear PartOf
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {issueSummary.brokenReferenceTo.length > 0 ? (
        <div className="issueExampleGroup">
          <p className="meta">Broken ReferenceTo examples:</p>
          <div className="actions">
            <button
              type="button"
              onClick={() => onClearReferenceToLinksBulk(issueSummary.brokenReferenceTo.map((concept) => concept.id))}
            >
              Clear all broken ReferenceTo links
            </button>
          </div>
          {issueSummary.brokenReferenceTo.slice(0, EXAMPLE_LIMIT).map((concept) => (
            <div key={`broken-reference-${concept.id}`} className="issueExampleRow">
              <span className="meta">
                {concept.name} ({conceptTypeById.get(concept.concept_type_id)?.name ?? concept.concept_type_id})
              </span>
              <div className="actions">
                <button type="button" onClick={() => onEdit(concept)}>
                  Edit
                </button>
                <button type="button" onClick={() => onClearReferenceToLink(concept.id)}>
                  Clear ReferenceTo
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {issueSummary.invalidPartOfType.length > 0 ? (
        <div className="issueExampleGroup">
          <p className="meta">Invalid PartOf type examples:</p>
          <div className="actions">
            <button
              type="button"
              onClick={() => onClearPartOfLinksBulk(issueSummary.invalidPartOfType.map((concept) => concept.id))}
            >
              Clear all invalid PartOf links
            </button>
          </div>
          {issueSummary.invalidPartOfType.slice(0, EXAMPLE_LIMIT).map((concept) => (
            <div key={`invalid-partof-type-${concept.id}`} className="issueExampleRow">
              <span className="meta">{concept.name}</span>
              <div className="actions">
                <button type="button" onClick={() => onEdit(concept)}>
                  Edit
                </button>
                <button type="button" onClick={() => onClearPartOfLink(concept.id)}>
                  Clear PartOf
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {issueSummary.invalidReferenceToType.length > 0 ? (
        <div className="issueExampleGroup">
          <p className="meta">Invalid ReferenceTo type examples:</p>
          <div className="actions">
            <button
              type="button"
              onClick={() => onClearReferenceToLinksBulk(issueSummary.invalidReferenceToType.map((concept) => concept.id))}
            >
              Clear all invalid ReferenceTo links
            </button>
          </div>
          {issueSummary.invalidReferenceToType.slice(0, EXAMPLE_LIMIT).map((concept) => (
            <div key={`invalid-reference-type-${concept.id}`} className="issueExampleRow">
              <span className="meta">{concept.name}</span>
              <div className="actions">
                <button type="button" onClick={() => onEdit(concept)}>
                  Edit
                </button>
                <button type="button" onClick={() => onClearReferenceToLink(concept.id)}>
                  Clear ReferenceTo
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {issueSummary.partOfCycleNodes.length > 0 ? (
        <div className="issueExampleGroup">
          <p className="meta">PartOf cycle node examples:</p>
          <div className="actions">
            <button
              type="button"
              onClick={() => onClearPartOfLinksBulk(issueSummary.partOfCycleNodes.map((concept) => concept.id))}
            >
              Break cycles by clearing PartOf links
            </button>
          </div>
          {issueSummary.partOfCycleNodes.slice(0, EXAMPLE_LIMIT).map((concept) => (
            <div key={`cycle-node-${concept.id}`} className="issueExampleRow">
              <span className="meta">{concept.name}</span>
              <div className="actions">
                <button type="button" onClick={() => onEdit(concept)}>
                  Edit
                </button>
                <button type="button" onClick={() => onClearPartOfLink(concept.id)}>
                  Clear PartOf
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {issueSummary.totalIssueCount > 0 ? (
        <label className="inlineToggle">
          <input
            type="checkbox"
            checked={showIssuesOnly}
            onChange={(event) => onToggleShowIssuesOnly(event.target.checked)}
          />
          View only affected concepts
        </label>
      ) : null}
    </div>
  )
}
