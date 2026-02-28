import type { ConceptRecord } from '../types'

type ConceptTreeNodeProps = {
  concept: ConceptRecord
  conceptById: Map<string, ConceptRecord>
  childrenByParentId: Map<string, ConceptRecord[]>
  conceptTypeNameById: Map<string, string>
  visited: Set<string>
  onEdit: (concept: ConceptRecord) => void
  onDelete: (id: string) => void
}

export function ConceptTreeNode({
  concept,
  conceptById,
  childrenByParentId,
  conceptTypeNameById,
  visited,
  onEdit,
  onDelete,
}: ConceptTreeNodeProps) {
  if (visited.has(concept.id)) {
    return (
      <li className="treeNode">
        <article className="row">
          <div>
            <h3>{concept.name}</h3>
            <p className="meta">Cycle detected in view; node expansion stopped.</p>
          </div>
        </article>
      </li>
    )
  }

  const nextVisited = new Set(visited)
  nextVisited.add(concept.id)

  const children = childrenByParentId.get(concept.id) ?? []

  return (
    <li className="treeNode">
      <article className="row">
        <div>
          <h3>{concept.name}</h3>
          {concept.description ? <p>{concept.description}</p> : null}
          <p className="meta">
            Type: {conceptTypeNameById.get(concept.concept_type_id) ?? concept.concept_type_id}
            {concept.reference_to_concept_id
              ? ` | RefTo: ${conceptById.get(concept.reference_to_concept_id)?.name ?? concept.reference_to_concept_id}`
              : ''}
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => onEdit(concept)}>
            Edit
          </button>
          <button type="button" onClick={() => onDelete(concept.id)}>
            Delete
          </button>
        </div>
      </article>

      {children.length > 0 ? (
        <ul className="treeList">
          {children.map((child) => (
            <ConceptTreeNode
              key={child.id}
              concept={child}
              conceptById={conceptById}
              childrenByParentId={childrenByParentId}
              conceptTypeNameById={conceptTypeNameById}
              visited={nextVisited}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
