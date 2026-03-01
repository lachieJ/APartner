import type { ConceptRecord } from '../types'
import type { CompactQuickReferenceCreateDraft } from '../types/compactMaintenance'

type ConceptCompactReferenceCreatePanelProps = {
  panelKey: string
  referenceTypeId: string
  referenceTypeName: string
  panelOpen: boolean
  draft: CompactQuickReferenceCreateDraft
  expectedParentTypeId: string | null
  expectedParentTypeName: string
  requiresParentSelection: boolean
  parentOptions: ConceptRecord[]
  onTogglePanel: (panelKey: string) => void
  onSetDraft: (panelKey: string, next: Partial<CompactQuickReferenceCreateDraft>) => void
  onCreate: (referenceTypeId: string, panelKey: string) => void
  onCancel: (panelKey: string) => void
}

export function ConceptCompactReferenceCreatePanel({
  panelKey,
  referenceTypeId,
  referenceTypeName,
  panelOpen,
  draft,
  expectedParentTypeId,
  expectedParentTypeName,
  requiresParentSelection,
  parentOptions,
  onTogglePanel,
  onSetDraft,
  onCreate,
  onCancel,
}: ConceptCompactReferenceCreatePanelProps): JSX.Element {
  return (
    <>
      <div className="actions">
        <button type="button" onClick={() => onTogglePanel(panelKey)}>
          {panelOpen ? `Close new ${referenceTypeName} panel` : `Add new ${referenceTypeName}`}
        </button>
      </div>
      {panelOpen ? (
        <div className="maintainInlineForm">
          <input
            value={draft.name}
            onChange={(event) => onSetDraft(panelKey, { name: event.target.value })}
            placeholder={`New ${referenceTypeName} name`}
          />
          <input
            value={draft.description}
            onChange={(event) => onSetDraft(panelKey, { description: event.target.value })}
            placeholder="Description"
          />
          {requiresParentSelection ? (
            <label>
              Parent Concept
              <select
                value={draft.parentConceptId}
                onChange={(event) => onSetDraft(panelKey, { parentConceptId: event.target.value })}
              >
                <option value="">(select)</option>
                {parentOptions.map((parentConcept) => (
                  <option key={parentConcept.id} value={parentConcept.id}>
                    {parentConcept.name} ({parentConcept.id})
                  </option>
                ))}
              </select>
              <span className="hint">
                Required parent type: {expectedParentTypeId ? expectedParentTypeName : '(none)'}
              </span>
            </label>
          ) : null}
          {requiresParentSelection && parentOptions.length === 0 ? (
            <p className="hint">No valid parent concepts exist yet. Create one first to add this reference concept.</p>
          ) : null}
          <div className="actions">
            <button
              type="button"
              onClick={() => onCreate(referenceTypeId, panelKey)}
              disabled={!draft.name.trim() || (requiresParentSelection && parentOptions.length > 0 && !draft.parentConceptId)}
            >
              Add reference instance
            </button>
            <button type="button" onClick={() => onCancel(panelKey)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
