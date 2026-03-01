import type { FormEvent } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'

type ConceptOption = {
  id: string
  name: string
  conceptTypeId: string
}

type ConceptEditorSectionProps = {
  editingId: string | null
  submitting: boolean
  name: string
  description: string
  conceptTypeId: string
  partOfConceptId: string
  partOrder: string
  referenceToConceptId: string
  conceptTypes: ConceptTypeRecord[]
  conceptOptions: ConceptOption[]
  onSetName: (value: string) => void
  onSetDescription: (value: string) => void
  onSetConceptTypeId: (value: string) => void
  onSetPartOfConceptId: (value: string) => void
  onSetPartOrder: (value: string) => void
  onSetReferenceToConceptId: (value: string) => void
  onClearError: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onReset: () => void
}

export function ConceptEditorSection({
  editingId,
  submitting,
  name,
  description,
  conceptTypeId,
  partOfConceptId,
  partOrder,
  referenceToConceptId,
  conceptTypes,
  conceptOptions,
  onSetName,
  onSetDescription,
  onSetConceptTypeId,
  onSetPartOfConceptId,
  onSetPartOrder,
  onSetReferenceToConceptId,
  onClearError,
  onSubmit,
  onReset,
}: ConceptEditorSectionProps) {
  const conceptTypeById = new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType]))

  const selectablePartOfConcepts = conceptOptions.filter(
    (option) => option.id !== editingId && option.conceptTypeId === conceptTypeById.get(conceptTypeId)?.part_of_concept_type_id,
  )

  const selectableReferenceConcepts = conceptOptions.filter(
    (option) =>
      option.id !== editingId &&
      option.conceptTypeId === conceptTypeById.get(conceptTypeId)?.reference_to_concept_type_id,
  )

  return (
    <section className="card">
      <h2>{editingId ? 'Edit Concept' : 'Create Concept'}</h2>
      <form onSubmit={onSubmit} className="formGrid">
        <label>
          Name
          <input
            value={name}
            onChange={(event) => {
              onSetName(event.target.value)
              onClearError()
            }}
            placeholder="Enter concept name"
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => onSetDescription(event.target.value)}
            placeholder="Optional description"
          />
        </label>

        <label>
          ConceptType
          <select
            value={conceptTypeId}
            onChange={(event) => {
              onSetConceptTypeId(event.target.value)
              onSetPartOfConceptId('')
              onSetReferenceToConceptId('')
            }}
          >
            <option value="">(select)</option>
            {conceptTypes.map((conceptType) => (
              <option key={conceptType.id} value={conceptType.id}>
                {conceptType.name} ({conceptType.id})
              </option>
            ))}
          </select>
          <span className="hint">Required. This determines allowable PartOf/ReferenceTo targets.</span>
        </label>

        <label>
          Part Of Concept
          <select
            value={partOfConceptId}
            onChange={(event) => {
              onSetPartOfConceptId(event.target.value)
              onClearError()
            }}
            disabled={!conceptTypeId || selectablePartOfConcepts.length === 0}
          >
            <option value="">(none)</option>
            {selectablePartOfConcepts.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name} ({concept.id})
              </option>
            ))}
          </select>
          <span className="hint">Options are filtered to the parent ConceptType required by this ConceptType.</span>
        </label>

        <label>
          Order Within Parent
          <input
            type="number"
            min={1}
            step={1}
            value={partOrder}
            onChange={(event) => {
              onSetPartOrder(event.target.value)
              onClearError()
            }}
            placeholder="1"
            disabled={!partOfConceptId}
          />
          <span className="hint">Optional ordering among siblings under the selected parent concept.</span>
        </label>

        <label>
          Reference To Concept
          <select
            value={referenceToConceptId}
            onChange={(event) => {
              onSetReferenceToConceptId(event.target.value)
              onClearError()
            }}
            disabled={!conceptTypeId || selectableReferenceConcepts.length === 0}
          >
            <option value="">(none)</option>
            {selectableReferenceConcepts.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name} ({concept.id})
              </option>
            ))}
          </select>
          <span className="hint">Options are filtered to the reference ConceptType declared by this ConceptType.</span>
        </label>

        <div className="actions">
          <button type="submit" disabled={submitting || conceptTypes.length === 0}>
            {submitting ? 'Saving...' : editingId ? 'Save' : 'Create'}
          </button>
          {editingId ? (
            <button type="button" onClick={onReset}>
              Cancel
            </button>
          ) : null}
        </div>
        {conceptTypes.length === 0 ? (
          <span className="hint">Create ConceptTypes first, then create Concepts that conform to those semantics.</span>
        ) : null}
      </form>
    </section>
  )
}