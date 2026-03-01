import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import type {
  CompactConceptDraft,
  CompactQuickReferenceCreateDraft,
  CompactReferenceCreationOptions,
} from '../types/compactMaintenance'
import { ConceptCompactAddChildPanel } from './ConceptCompactInlinePanels'

type ChildTypeNodeDataProps = {
  childType: ConceptTypeRecord
  createDraft: CompactConceptDraft
  requiredReferenceTypeId: string | null
  requiredReferenceTypeName: string
  referenceOptions: ConceptRecord[]
  referenceCreatePanelKey: string
  referenceCreateDraft: CompactQuickReferenceCreateDraft
  referenceCreation: CompactReferenceCreationOptions
  expectedParentTypeName: string
  childConceptNodes: JSX.Element[]
}

type ChildTypeNodeUiProps = {
  showEditControls: boolean
  addPanelOpen: boolean
  referenceCreatePanelOpen: boolean
}

type ChildTypeNodeActionsProps = {
  onToggleAddPanel: () => void
  onSetCreateDraft: (next: Partial<CompactConceptDraft>) => void
  onToggleQuickReferenceCreatePanel: (panelKey: string) => void
  onSetQuickReferenceCreateDraft: (
    panelKey: string,
    next: Partial<CompactQuickReferenceCreateDraft>,
  ) => void
  onCreateReferenceConcept: (referenceTypeId: string, panelKey: string) => void
  onCloseQuickReferenceCreatePanel: (panelKey: string) => void
  onAddChild: () => void
}

type ConceptCompactChildTypeNodeProps = {
  data: ChildTypeNodeDataProps
  ui: ChildTypeNodeUiProps
  actions: ChildTypeNodeActionsProps
}

export function ConceptCompactChildTypeNode({
  data,
  ui,
  actions,
}: ConceptCompactChildTypeNodeProps): JSX.Element {
  const {
    childType,
    createDraft,
    requiredReferenceTypeId,
    requiredReferenceTypeName,
    referenceOptions,
    referenceCreatePanelKey,
    referenceCreateDraft,
    referenceCreation,
    expectedParentTypeName,
    childConceptNodes,
  } = data
  const { showEditControls, addPanelOpen, referenceCreatePanelOpen } = ui
  const {
    onToggleAddPanel,
    onSetCreateDraft,
    onToggleQuickReferenceCreatePanel,
    onSetQuickReferenceCreateDraft,
    onCreateReferenceConcept,
    onCloseQuickReferenceCreatePanel,
    onAddChild,
  } = actions

  return (
    <li className="treeNode">
      <div className="treeCompactRow treeTypeRow">
        <p>{childType.name}</p>
        {showEditControls ? (
          <div className="actions">
            <button type="button" onClick={onToggleAddPanel}>
              {addPanelOpen ? 'Close' : 'Add'}
            </button>
          </div>
        ) : null}
      </div>
      {showEditControls && addPanelOpen ? (
        <ConceptCompactAddChildPanel
          data={{
            childTypeName: childType.name,
            createDraft,
            requiredReferenceTypeId,
            requiredReferenceTypeName,
            referenceOptions,
            referenceCreatePanelKey,
            referenceCreateDraft,
            referenceCreation,
            expectedParentTypeName,
          }}
          ui={{
            referenceCreatePanelOpen,
          }}
          actions={{
            onSetCreateDraft,
            onToggleQuickReferenceCreatePanel,
            onSetQuickReferenceCreateDraft,
            onCreateReferenceConcept,
            onCloseQuickReferenceCreatePanel,
            onAdd: onAddChild,
            onCancel: onToggleAddPanel,
          }}
        />
      ) : null}
      {childConceptNodes.length > 0 ? <ul className="treeList">{childConceptNodes}</ul> : null}
    </li>
  )
}
