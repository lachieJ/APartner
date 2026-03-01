import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'

type RootCreateDraft = {
  name: string
  description: string
}

type ConceptCompactControlsProps = {
  selectedRootTypeId: string
  selectedRootConceptId: string
  showEditControls: boolean
  rootCreateDraft: RootCreateDraft
  rootOrDecomposableTypes: ConceptTypeRecord[]
  rootConceptOptions: ConceptRecord[]
  selectedRootType: ConceptTypeRecord | null
  onSetSelectedRootTypeId: (value: string) => void
  onSetSelectedRootConceptId: (value: string) => void
  onSetShowEditControls: (value: boolean) => void
  onSetRootCreateDraft: (value: RootCreateDraft | ((previous: RootCreateDraft) => RootCreateDraft)) => void
  onAddRootInstance: () => Promise<void>
  onNormalizeSiblingOrders: () => Promise<void>
  disableNormalizeSiblingOrders: boolean
}

export function ConceptCompactControls({
  selectedRootTypeId,
  selectedRootConceptId,
  showEditControls,
  rootCreateDraft,
  rootOrDecomposableTypes,
  rootConceptOptions,
  selectedRootType,
  onSetSelectedRootTypeId,
  onSetSelectedRootConceptId,
  onSetShowEditControls,
  onSetRootCreateDraft,
  onAddRootInstance,
  onNormalizeSiblingOrders,
  disableNormalizeSiblingOrders,
}: ConceptCompactControlsProps) {
  return (
    <>
      <p className="meta">Compact PartOf view</p>
      <div className="viewControls">
        <label>
          Root/Decomposable ConceptType
          <select
            value={selectedRootTypeId}
            onChange={(event) => {
              onSetSelectedRootTypeId(event.target.value)
              onSetSelectedRootConceptId('')
            }}
          >
            <option value="">(select)</option>
            {rootOrDecomposableTypes.map((conceptType) => (
              <option key={conceptType.id} value={conceptType.id}>
                {conceptType.name} ({conceptType.id})
              </option>
            ))}
          </select>
        </label>

        <label>
          Concept instance
          <select value={selectedRootConceptId} onChange={(event) => onSetSelectedRootConceptId(event.target.value)}>
            <option value="">(select)</option>
            {rootConceptOptions.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name} ({concept.id})
              </option>
            ))}
          </select>
        </label>

        <label className="inlineToggle">
          <input
            type="checkbox"
            checked={showEditControls}
            onChange={(event) => {
              onSetShowEditControls(event.target.checked)
            }}
          />
          Show edit controls
        </label>
      </div>

      {!selectedRootType ? <p className="hint">Select a root or decomposable ConceptType to begin.</p> : null}
      {selectedRootType && rootConceptOptions.length === 0 ? (
        <p className="hint">No concept instances exist for the selected ConceptType.</p>
      ) : null}

      {showEditControls && selectedRootType && !selectedRootConceptId ? (
        <div className="maintainInlineForm">
          <p className="meta">Add new {selectedRootType.name} instance</p>
          <input
            value={rootCreateDraft.name}
            onChange={(event) => onSetRootCreateDraft((previous) => ({ ...previous, name: event.target.value }))}
            placeholder={`New ${selectedRootType.name} name`}
          />
          <input
            value={rootCreateDraft.description}
            onChange={(event) =>
              onSetRootCreateDraft((previous) => ({ ...previous, description: event.target.value }))
            }
            placeholder="Description"
          />
          <div className="actions">
            <button type="button" onClick={() => void onAddRootInstance()} disabled={!rootCreateDraft.name.trim()}>
              Add root instance
            </button>
            <button
              type="button"
              onClick={() => void onNormalizeSiblingOrders()}
              disabled={disableNormalizeSiblingOrders}
            >
              Order siblings
            </button>
          </div>
        </div>
      ) : showEditControls ? (
        <div className="actions">
          <button
            type="button"
            onClick={() => void onNormalizeSiblingOrders()}
            disabled={disableNormalizeSiblingOrders}
          >
            Order siblings
          </button>
        </div>
      ) : null}
    </>
  )
}
