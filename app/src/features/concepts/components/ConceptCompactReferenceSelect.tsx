import type { ConceptRecord } from '../types'

type ConceptCompactReferenceSelectProps = {
  referenceTypeId: string
  referenceTypeName: string
  selectedReferenceConceptId: string
  referenceOptions: ConceptRecord[]
  onChange: (referenceConceptId: string) => void
}

export function ConceptCompactReferenceSelect({
  referenceTypeId,
  referenceTypeName,
  selectedReferenceConceptId,
  referenceOptions,
  onChange,
}: ConceptCompactReferenceSelectProps): JSX.Element {
  return (
    <>
      <label>
        Reference To
        <select value={selectedReferenceConceptId} onChange={(event) => onChange(event.target.value)}>
          <option value="">(none)</option>
          {referenceOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.id})
            </option>
          ))}
        </select>
        <span className="hint">Must reference a concept of type {referenceTypeName || referenceTypeId}.</span>
      </label>
      {referenceOptions.length === 0 ? (
        <p className="hint">No valid reference concepts yet. Add an instance of {referenceTypeName || referenceTypeId} first.</p>
      ) : null}
    </>
  )
}
