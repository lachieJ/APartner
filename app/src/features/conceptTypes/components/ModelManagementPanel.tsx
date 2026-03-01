type ModelManagementPanelProps = {
  conceptTypeCount: number
  actionInProgress: 'reset' | 'structure' | 'purge' | null
  managementReason: string
  setManagementReason: (value: string) => void
  managementConfirmText: string
  setManagementConfirmText: (value: string) => void
  structureRootId: string
  setStructureRootId: (value: string) => void
  structureRootOptions: { id: string; name: string }[]
  structurePreview: {
    subtreeSize: number
    externalPartOfBlockers: { id: string; name: string }[]
    externalReferenceBlockers: { id: string; name: string }[]
  }
  structureExternalReferencePolicy: 'block' | 'null-reference-to'
  setStructureExternalReferencePolicy: (value: 'block' | 'null-reference-to') => void
  createVersionOnReset: boolean
  setCreateVersionOnReset: (value: boolean) => void
  createVersionOnStructureDelete: boolean
  setCreateVersionOnStructureDelete: (value: boolean) => void
  onResetModel: () => void
  onDeleteStructure: () => void
  onPurgeModel: () => void
}

export function ModelManagementPanel({
  conceptTypeCount,
  actionInProgress,
  managementReason,
  setManagementReason,
  managementConfirmText,
  setManagementConfirmText,
  structureRootId,
  setStructureRootId,
  structureRootOptions,
  structurePreview,
  structureExternalReferencePolicy,
  setStructureExternalReferencePolicy,
  createVersionOnReset,
  setCreateVersionOnReset,
  createVersionOnStructureDelete,
  setCreateVersionOnStructureDelete,
  onResetModel,
  onDeleteStructure,
  onPurgeModel,
}: ModelManagementPanelProps) {
  return (
    <section className="card">
      <h2>Model Management</h2>
      <p className="hint">
        High-impact operations. Provide a reason and typed confirmation before execution.
      </p>

      <div className="issuesPanel">
        <p className="issuesTitle">Reset Model (delete all metamodel types)</p>
        <p className="hint">Deletes all {conceptTypeCount} metamodel type(s). Recommended for sandbox resets.</p>
        <label className="inlineToggle">
          <input
            type="checkbox"
            checked={createVersionOnReset}
            onChange={(event) => setCreateVersionOnReset(event.target.checked)}
          />
          Create version snapshot before reset
        </label>
        <div className="actions">
          <button type="button" onClick={onResetModel} disabled={actionInProgress !== null}>
            {actionInProgress === 'reset' ? 'Resetting...' : 'Reset Model'}
          </button>
        </div>
      </div>

      <div className="issuesPanel">
        <p className="issuesTitle">Delete Structure (root + all parts)</p>
        <label>
          Structure root
          <select value={structureRootId} onChange={(event) => setStructureRootId(event.target.value)}>
            <option value="">Select root metamodel type</option>
            {structureRootOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">Subtree size: {structurePreview.subtreeSize}</p>
        {structurePreview.externalPartOfBlockers.length > 0 ? (
          <p className="fileError">
            External PartOf blockers: {structurePreview.externalPartOfBlockers.slice(0, 5).map((item) => item.name).join(', ')}
            {structurePreview.externalPartOfBlockers.length > 5 ? '…' : ''}
          </p>
        ) : null}
        {structurePreview.externalReferenceBlockers.length > 0 ? (
          <p className="hint">
            External ReferenceTo blockers: {structurePreview.externalReferenceBlockers.slice(0, 5).map((item) => item.name).join(', ')}
            {structurePreview.externalReferenceBlockers.length > 5 ? '…' : ''}
          </p>
        ) : null}
        <label>
          External ReferenceTo policy
          <select
            value={structureExternalReferencePolicy}
            onChange={(event) =>
              setStructureExternalReferencePolicy(event.target.value as 'block' | 'null-reference-to')
            }
          >
            <option value="block">Block delete when external ReferenceTo links exist</option>
            <option value="null-reference-to">Null ReferenceTo blockers and continue</option>
          </select>
        </label>
        <label className="inlineToggle">
          <input
            type="checkbox"
            checked={createVersionOnStructureDelete}
            onChange={(event) => setCreateVersionOnStructureDelete(event.target.checked)}
          />
          Create version snapshot before structure delete
        </label>
        <div className="actions">
          <button type="button" onClick={onDeleteStructure} disabled={actionInProgress !== null}>
            {actionInProgress === 'structure' ? 'Deleting structure...' : 'Delete Structure'}
          </button>
        </div>
      </div>

      <details className="issuesPanel">
        <summary className="issuesTitle">Danger Zone: Emergency Purge (no version snapshot)</summary>
        <p className="hint">Deletes all metamodel types without creating a version. Use only for clean-start recovery.</p>
        <div className="actions">
          <button type="button" onClick={onPurgeModel} disabled={actionInProgress !== null}>
            {actionInProgress === 'purge' ? 'Purging...' : 'Purge Model'}
          </button>
        </div>
      </details>

      <div className="viewControls">
        <label>
          Reason (required)
          <input
            value={managementReason}
            onChange={(event) => setManagementReason(event.target.value)}
            placeholder="Why is this operation required?"
          />
        </label>
        <label>
          Typed confirmation (RESET / DELETE STRUCTURE / PURGE)
          <input
            value={managementConfirmText}
            onChange={(event) => setManagementConfirmText(event.target.value)}
            placeholder="Type the required confirmation phrase"
          />
        </label>
      </div>
    </section>
  )
}
