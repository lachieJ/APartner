import type { ConceptTypeRecord } from '../csv/types'
import type { ConceptTypeTreeRowActions } from '../types/listActions'
import { getCopyIdKey, getCopyNameKey } from '../utils/conceptTypeRowHelpers'

type ConceptTypeTreeNodeProps = {
  conceptType: ConceptTypeRecord
  parentId: string | null
  visited: Set<string>
  childrenByParentId: Map<string, ConceptTypeRecord[]>
  expandedDescriptionIds: Record<string, boolean>
  copiedKey: string | null
  movingConceptTypeId: string | null
  actions: ConceptTypeTreeRowActions
}

export function ConceptTypeTreeNode({
  conceptType,
  parentId,
  visited,
  childrenByParentId,
  expandedDescriptionIds,
  copiedKey,
  movingConceptTypeId,
  actions,
}: ConceptTypeTreeNodeProps) {
  const children = (childrenByParentId.get(conceptType.id) ?? []).filter(
    (child) => child.id !== conceptType.id && !visited.has(child.id),
  )

  const siblings = parentId ? childrenByParentId.get(parentId) ?? [] : []
  const siblingIndex = siblings.findIndex((sibling) => sibling.id === conceptType.id)
  const canMoveUp = siblingIndex > 0
  const canMoveDown = siblingIndex >= 0 && siblingIndex < siblings.length - 1

  const nextVisited = new Set(visited)
  nextVisited.add(conceptType.id)

  return (
    <li key={conceptType.id} className="treeNode">
      <article className="row">
        <div>
          <h3>{conceptType.name}</h3>
          <p className={expandedDescriptionIds[conceptType.id] ? '' : 'clampedText'}>
            {conceptType.description || 'No description'}
          </p>
          {conceptType.description ? (
            <button type="button" className="linkButton" onClick={() => actions.onToggleDescription(conceptType.id)}>
              {expandedDescriptionIds[conceptType.id] ? 'Show less' : 'Show more'}
            </button>
          ) : null}
          <p className="meta">Id: {conceptType.id}</p>
          <p className="meta">PartOf: {conceptType.part_of_concept_type_id || '(none)'}</p>
          <p className="meta">Order: {conceptType.part_order ?? '(none)'}</p>
          <p className="meta">ReferenceTo: {conceptType.reference_to_concept_type_id || '(none)'}</p>
        </div>
        <div className="actions">
          {parentId ? (
            <>
              <button
                onClick={() => actions.onMoveConceptType(conceptType.id, 'up')}
                disabled={!canMoveUp || movingConceptTypeId === conceptType.id}
              >
                Up
              </button>
              <button
                onClick={() => actions.onMoveConceptType(conceptType.id, 'down')}
                disabled={!canMoveDown || movingConceptTypeId === conceptType.id}
              >
                Down
              </button>
            </>
          ) : null}
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

      {children.length > 0 ? (
        <ul className="treeList">
          {children.map((child) => (
            <ConceptTypeTreeNode
              key={child.id}
              conceptType={child}
              parentId={conceptType.id}
              visited={nextVisited}
              childrenByParentId={childrenByParentId}
              expandedDescriptionIds={expandedDescriptionIds}
              copiedKey={copiedKey}
              movingConceptTypeId={movingConceptTypeId}
              actions={actions}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
