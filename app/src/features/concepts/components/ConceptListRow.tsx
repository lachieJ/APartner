import type { ConceptRecord } from '../types'

type ConceptListRowProps = {
  concept: ConceptRecord
  conceptTypeNameById: Map<string, string>
  conceptById: Map<string, ConceptRecord>
  onMoveConceptWithinParent: (id: string, direction: 'up' | 'down') => Promise<void>
  onEditConcept: (concept: ConceptRecord) => void
  onDeleteConcept: (id: string) => void
}

export function ConceptListRow({
  concept,
  conceptTypeNameById,
  conceptById,
  onMoveConceptWithinParent,
  onEditConcept,
  onDeleteConcept,
}: ConceptListRowProps) {
  return (
    <article className="row">
      <div>
        <h3>{concept.name}</h3>
        {concept.description ? <p>{concept.description}</p> : null}
        <p className="meta">
          Type: {conceptTypeNameById.get(concept.concept_type_id) ?? concept.concept_type_id}
          {concept.part_of_concept_id
            ? ` | PartOf: ${conceptById.get(concept.part_of_concept_id)?.name ?? concept.part_of_concept_id}`
            : ''}
          {concept.part_order !== null ? ` | PartOrder: ${concept.part_order}` : ''}
          {concept.reference_to_concept_id
            ? ` | RefTo: ${conceptById.get(concept.reference_to_concept_id)?.name ?? concept.reference_to_concept_id}`
            : ''}
        </p>
      </div>
      <div className="actions">
        <button
          type="button"
          onClick={() => void onMoveConceptWithinParent(concept.id, 'up')}
          disabled={!concept.part_of_concept_id}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => void onMoveConceptWithinParent(concept.id, 'down')}
          disabled={!concept.part_of_concept_id}
        >
          ↓
        </button>
        <button type="button" onClick={() => onEditConcept(concept)}>
          Edit
        </button>
        <button type="button" onClick={() => onDeleteConcept(concept.id)}>
          Delete
        </button>
      </div>
    </article>
  )
}