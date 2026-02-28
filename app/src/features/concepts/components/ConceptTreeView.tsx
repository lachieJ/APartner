import type { ConceptRecord } from '../types'
import { ConceptTreeNode } from './ConceptTreeNode'

type ConceptTreeViewProps = {
  rootConcepts: ConceptRecord[]
  conceptById: Map<string, ConceptRecord>
  childrenByParentId: Map<string, ConceptRecord[]>
  conceptTypeNameById: Map<string, string>
  onEditConcept: (concept: ConceptRecord) => void
  onDeleteConcept: (id: string) => void
}

export function ConceptTreeView({
  rootConcepts,
  conceptById,
  childrenByParentId,
  conceptTypeNameById,
  onEditConcept,
  onDeleteConcept,
}: ConceptTreeViewProps) {
  if (rootConcepts.length === 0) {
    return <p className="hint">No root concepts found. Switch to flat view to inspect the current dataset.</p>
  }

  return (
    <ul className="treeList">
      {rootConcepts.map((rootConcept) => (
        <ConceptTreeNode
          key={rootConcept.id}
          concept={rootConcept}
          conceptById={conceptById}
          childrenByParentId={childrenByParentId}
          conceptTypeNameById={conceptTypeNameById}
          visited={new Set()}
          onEdit={onEditConcept}
          onDelete={onDeleteConcept}
        />
      ))}
    </ul>
  )
}