import type { ConceptRecord } from '../types'
import type {
  CompactConceptDraft,
  CompactQuickReferenceCreateDraft,
  CompactReferenceCreationOptions,
} from '../types/compactMaintenance'
import { ConceptCompactReferenceCreatePanel } from './ConceptCompactReferenceCreatePanel'
import { ConceptCompactReferenceSelect } from './ConceptCompactReferenceSelect'

type EditPanelDataProps = {
  editDraft: CompactConceptDraft
  requiredReferenceTypeId: string | null
  requiredReferenceTypeName: string
  referenceOptions: ConceptRecord[]
  referenceCreatePanelKey: string
  referenceCreateDraft: CompactQuickReferenceCreateDraft
  referenceCreation: CompactReferenceCreationOptions
  expectedParentTypeName: string
}

type EditPanelUiProps = {
  referenceCreatePanelOpen: boolean
}

type EditPanelActionsProps = {
  onSetEditDraft: (next: Partial<CompactConceptDraft>) => void
  onToggleQuickReferenceCreatePanel: (panelKey: string) => void
  onSetQuickReferenceCreateDraft: (panelKey: string, next: Partial<CompactQuickReferenceCreateDraft>) => void
  onCreateReferenceConcept: (referenceTypeId: string, panelKey: string) => void
  onCloseQuickReferenceCreatePanel: (panelKey: string) => void
  onSave: () => void
  onCancel: () => void
}

type ConceptCompactEditPanelProps = {
  data: EditPanelDataProps
  ui: EditPanelUiProps
  actions: EditPanelActionsProps
}

export function ConceptCompactEditPanel({
  data,
  ui,
  actions,
}: ConceptCompactEditPanelProps): JSX.Element {
  const {
    editDraft,
    requiredReferenceTypeId,
    requiredReferenceTypeName,
    referenceOptions,
    referenceCreatePanelKey,
    referenceCreateDraft,
    referenceCreation,
    expectedParentTypeName,
  } = data
  const { referenceCreatePanelOpen } = ui
  const {
    onSetEditDraft,
    onToggleQuickReferenceCreatePanel,
    onSetQuickReferenceCreateDraft,
    onCreateReferenceConcept,
    onCloseQuickReferenceCreatePanel,
    onSave,
    onCancel,
  } = actions

  return (
    <div className="maintainInlineForm">
      <input
        value={editDraft.name}
        onChange={(event) => onSetEditDraft({ name: event.target.value })}
        placeholder="Concept name"
      />
      <input
        value={editDraft.description}
        onChange={(event) => onSetEditDraft({ description: event.target.value })}
        placeholder="Description"
      />
      {requiredReferenceTypeId ? (
        <ConceptCompactReferenceSelect
          referenceTypeId={requiredReferenceTypeId}
          referenceTypeName={requiredReferenceTypeName}
          selectedReferenceConceptId={editDraft.referenceToConceptId}
          referenceOptions={referenceOptions}
          onChange={(referenceToConceptId) => onSetEditDraft({ referenceToConceptId })}
        />
      ) : null}
      {requiredReferenceTypeId ? (
        <ConceptCompactReferenceCreatePanel
          panelKey={referenceCreatePanelKey}
          referenceTypeId={requiredReferenceTypeId}
          referenceTypeName={requiredReferenceTypeName}
          panelOpen={referenceCreatePanelOpen}
          draft={referenceCreateDraft}
          expectedParentTypeId={referenceCreation.expectedParentTypeId}
          expectedParentTypeName={expectedParentTypeName}
          requiresParentSelection={referenceCreation.requiresParentSelection}
          parentOptions={referenceCreation.parentOptions}
          onTogglePanel={onToggleQuickReferenceCreatePanel}
          onSetDraft={onSetQuickReferenceCreateDraft}
          onCreate={onCreateReferenceConcept}
          onCancel={onCloseQuickReferenceCreatePanel}
        />
      ) : null}
      <div className="actions">
        <button type="button" onClick={onSave}>
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

type AddChildPanelDataProps = {
  childTypeName: string
  createDraft: CompactConceptDraft
  requiredReferenceTypeId: string | null
  requiredReferenceTypeName: string
  referenceOptions: ConceptRecord[]
  referenceCreatePanelKey: string
  referenceCreateDraft: CompactQuickReferenceCreateDraft
  referenceCreation: CompactReferenceCreationOptions
  expectedParentTypeName: string
}

type AddChildPanelUiProps = {
  referenceCreatePanelOpen: boolean
}

type AddChildPanelActionsProps = {
  onSetCreateDraft: (next: Partial<CompactConceptDraft>) => void
  onToggleQuickReferenceCreatePanel: (panelKey: string) => void
  onSetQuickReferenceCreateDraft: (panelKey: string, next: Partial<CompactQuickReferenceCreateDraft>) => void
  onCreateReferenceConcept: (referenceTypeId: string, panelKey: string) => void
  onCloseQuickReferenceCreatePanel: (panelKey: string) => void
  onAdd: () => void
  onCancel: () => void
}

type ConceptCompactAddChildPanelProps = {
  data: AddChildPanelDataProps
  ui: AddChildPanelUiProps
  actions: AddChildPanelActionsProps
}

export function ConceptCompactAddChildPanel({
  data,
  ui,
  actions,
}: ConceptCompactAddChildPanelProps): JSX.Element {
  const {
    childTypeName,
    createDraft,
    requiredReferenceTypeId,
    requiredReferenceTypeName,
    referenceOptions,
    referenceCreatePanelKey,
    referenceCreateDraft,
    referenceCreation,
    expectedParentTypeName,
  } = data
  const { referenceCreatePanelOpen } = ui
  const {
    onSetCreateDraft,
    onToggleQuickReferenceCreatePanel,
    onSetQuickReferenceCreateDraft,
    onCreateReferenceConcept,
    onCloseQuickReferenceCreatePanel,
    onAdd,
    onCancel,
  } = actions

  return (
    <div className="maintainInlineForm">
      <input value={createDraft.name} onChange={(event) => onSetCreateDraft({ name: event.target.value })} placeholder={`New ${childTypeName}`} />
      <input
        value={createDraft.description}
        onChange={(event) => onSetCreateDraft({ description: event.target.value })}
        placeholder="Description"
      />
      {requiredReferenceTypeId ? (
        <ConceptCompactReferenceSelect
          referenceTypeId={requiredReferenceTypeId}
          referenceTypeName={requiredReferenceTypeName}
          selectedReferenceConceptId={createDraft.referenceToConceptId}
          referenceOptions={referenceOptions}
          onChange={(referenceToConceptId) => onSetCreateDraft({ referenceToConceptId })}
        />
      ) : null}
      {requiredReferenceTypeId ? (
        <ConceptCompactReferenceCreatePanel
          panelKey={referenceCreatePanelKey}
          referenceTypeId={requiredReferenceTypeId}
          referenceTypeName={requiredReferenceTypeName}
          panelOpen={referenceCreatePanelOpen}
          draft={referenceCreateDraft}
          expectedParentTypeId={referenceCreation.expectedParentTypeId}
          expectedParentTypeName={expectedParentTypeName}
          requiresParentSelection={referenceCreation.requiresParentSelection}
          parentOptions={referenceCreation.parentOptions}
          onTogglePanel={onToggleQuickReferenceCreatePanel}
          onSetDraft={onSetQuickReferenceCreateDraft}
          onCreate={onCreateReferenceConcept}
          onCancel={onCloseQuickReferenceCreatePanel}
        />
      ) : null}
      <div className="actions">
        <button type="button" onClick={onAdd} disabled={!createDraft.name.trim()}>
          Add
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
