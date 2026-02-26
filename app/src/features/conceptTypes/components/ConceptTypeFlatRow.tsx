import type { ConceptTypeRecord } from '../csv/types'
import type { ConceptTypeFlatRowActions } from '../types/listActions'
import { getCopyIdKey, getCopyNameKey, type ConceptTypeUsage } from '../utils/conceptTypeRowHelpers'

type ConceptTypeFlatRowProps = {
  conceptType: ConceptTypeRecord
  usage: ConceptTypeUsage
  isDescriptionExpanded: boolean
  isUsageExpanded: boolean
  copiedKey: string | null
  actions: ConceptTypeFlatRowActions
}

export function ConceptTypeFlatRow({
  conceptType,
  usage,
  isDescriptionExpanded,
  isUsageExpanded,
  copiedKey,
  actions,
}: ConceptTypeFlatRowProps) {
  return (
    <article key={conceptType.id} className="row">
      <div>
        <h3>{conceptType.name}</h3>
        <p className={isDescriptionExpanded ? '' : 'clampedText'}>{conceptType.description || 'No description'}</p>
        {conceptType.description ? (
          <button type="button" className="linkButton" onClick={() => actions.onToggleDescription(conceptType.id)}>
            {isDescriptionExpanded ? 'Show less' : 'Show more'}
          </button>
        ) : null}
        <p className="meta">Id: {conceptType.id}</p>
        <p className="meta">PartOf: {conceptType.part_of_concept_type_id || '(none)'}</p>
        <p className="meta">Order: {conceptType.part_order ?? '(none)'}</p>
        <p className="meta">ReferenceTo: {conceptType.reference_to_concept_type_id || '(none)'}</p>
        <p className="meta">
          Used by PartOf: {usage.usedAsPartOfBy.length} | Used by ReferenceTo: {usage.usedAsReferenceToBy.length}
        </p>

        {isUsageExpanded ? (
          <div className="usagePanel">
            <div>
              <p className="meta usageTitle">Used as PartOf by</p>
              {usage.usedAsPartOfBy.length === 0 ? (
                <p className="meta">(none)</p>
              ) : (
                <ul className="usageList">
                  {usage.usedAsPartOfBy.map((item) => (
                    <li key={`partof-${conceptType.id}-${item.id}`}>{item.name}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="meta usageTitle">Used as ReferenceTo by</p>
              {usage.usedAsReferenceToBy.length === 0 ? (
                <p className="meta">(none)</p>
              ) : (
                <ul className="usageList">
                  {usage.usedAsReferenceToBy.map((item) => (
                    <li key={`refto-${conceptType.id}-${item.id}`}>{item.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <div className="actions">
        <button type="button" onClick={() => actions.onToggleUsage(conceptType.id)}>
          {isUsageExpanded ? 'Hide usage' : 'Where used'}
        </button>
        <button type="button" onClick={() => void actions.onCopyValue(conceptType.id, getCopyIdKey(conceptType.id))}>
          {copiedKey === getCopyIdKey(conceptType.id) ? 'Copied' : 'Copy ID'}
        </button>
        <button type="button" onClick={() => void actions.onCopyValue(conceptType.name, getCopyNameKey(conceptType.id))}>
          {copiedKey === getCopyNameKey(conceptType.id) ? 'Copied' : 'Copy Name'}
        </button>
        <button onClick={() => actions.onEdit(conceptType)}>Edit</button>
        <button onClick={() => actions.onDelete(conceptType.id)}>Delete</button>
      </div>
    </article>
  )
}
