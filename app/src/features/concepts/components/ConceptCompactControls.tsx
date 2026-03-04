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
  maxTreeDepth: number | null
  canCopyConceptModelFromRoot: boolean
  onSetSelectedRootTypeId: (value: string) => void
  onSetSelectedRootConceptId: (value: string) => void
  onSetMaxTreeDepth: (value: number | null) => void
  onSetShowEditControls: (value: boolean) => void
  onSetRootCreateDraft: (value: RootCreateDraft | ((previous: RootCreateDraft) => RootCreateDraft)) => void
  onAddRootInstance: () => Promise<void>
  onCopyConceptModelFromRoot: () => Promise<void>
  onNormalizeSiblingOrders: () => Promise<void>
  disableNormalizeSiblingOrders: boolean
  disableCopyConceptModel: boolean
}

export function ConceptCompactControls({
  selectedRootTypeId,
  selectedRootConceptId,
  showEditControls,
  rootCreateDraft,
  rootOrDecomposableTypes,
  rootConceptOptions,
  selectedRootType,
  maxTreeDepth,
  canCopyConceptModelFromRoot,
  onSetSelectedRootTypeId,
  onSetSelectedRootConceptId,
  onSetMaxTreeDepth,
  onSetShowEditControls,
  onSetRootCreateDraft,
  onAddRootInstance,
  onCopyConceptModelFromRoot,
  onNormalizeSiblingOrders,
  disableNormalizeSiblingOrders,
  disableCopyConceptModel,
}: ConceptCompactControlsProps) {
  const depthSelectValue = maxTreeDepth === null ? 'all' : String(maxTreeDepth)
  const isDecomposableRootType = Boolean(
    selectedRootType && selectedRootType.part_of_concept_type_id === selectedRootType.id,
  )
  const selectedConceptValue = selectedRootConceptId || (isDecomposableRootType ? '__all__' : '')

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
          <select
            value={selectedConceptValue}
            onChange={(event) => onSetSelectedRootConceptId(event.target.value === '__all__' ? '' : event.target.value)}
          >
            {isDecomposableRootType ? <option value="__all__">Show all roots</option> : <option value="">(select)</option>}
            {rootConceptOptions.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name} ({concept.id})
              </option>
            ))}
          </select>
        </label>

        <label>
          Tree depth
          <select
            value={depthSelectValue}
            onChange={(event) => {
              const nextValue = event.target.value
              if (nextValue === 'all') {
                onSetMaxTreeDepth(null)
                return
              }

              onSetMaxTreeDepth(Number.parseInt(nextValue, 10))
            }}
          >
            <option value="all">All</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
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
      {isDecomposableRootType && !selectedRootConceptId ? (
        <p className="hint">Decomposable ConceptTypes show all root instances when Concept instance is left unselected.</p>
      ) : null}
      {selectedRootType && selectedRootConceptId && !canCopyConceptModelFromRoot ? (
        <p className="hint">Copy model is currently limited to concepts selected from true root ConceptTypes.</p>
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
      ) : showEditControls && selectedRootType ? (
        <div className="actions">
          <button
            type="button"
            onClick={() => void onCopyConceptModelFromRoot()}
            disabled={!canCopyConceptModelFromRoot || disableCopyConceptModel}
          >
            Copy model from root
          </button>
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
