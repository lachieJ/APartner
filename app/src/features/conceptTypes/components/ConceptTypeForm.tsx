import type { ConceptTypeFormErrorField, ConceptTypeFormErrors } from '../types/form'

type ConceptTypeOption = {
  id: string
  name: string
}

type ConceptTypeFormProps = {
  editingId: string | null
  name: string
  description: string
  partOfConceptTypeId: string
  partOrder: string
  referenceToConceptTypeId: string
  formErrors: ConceptTypeFormErrors
  conceptTypeOptions: ConceptTypeOption[]
  setName: (value: string) => void
  setDescription: (value: string) => void
  setPartOfConceptTypeId: (value: string) => void
  setPartOrder: (value: string) => void
  setReferenceToConceptTypeId: (value: string) => void
  clearFieldError: (field: ConceptTypeFormErrorField) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function ConceptTypeForm({
  editingId,
  name,
  description,
  partOfConceptTypeId,
  partOrder,
  referenceToConceptTypeId,
  formErrors,
  conceptTypeOptions,
  setName,
  setDescription,
  setPartOfConceptTypeId,
  setPartOrder,
  setReferenceToConceptTypeId,
  clearFieldError,
  onSubmit,
  onCancel,
}: ConceptTypeFormProps) {
  return (
    <section className="card">
      <h2>{editingId ? 'Edit ConceptType' : 'Create ConceptType'}</h2>
      <form onSubmit={onSubmit} className="formGrid">
        <label>
          Name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              clearFieldError('name')
            }}
            placeholder="Enter concept type name"
            required
          />
          {formErrors.name ? <span className="fileError">{formErrors.name}</span> : null}
          <span className="hint">
            Use a clear type label, for example: Enterprise, Value Stream, or Information Concept.
          </span>
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description"
          />
        </label>

        <label>
          Part Of Concept Type
          <select
            value={partOfConceptTypeId}
            onChange={(event) => {
              setPartOfConceptTypeId(event.target.value)
              clearFieldError('partOfConceptTypeId')
            }}
          >
            <option value="">(none)</option>
            {conceptTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.id})
              </option>
            ))}
          </select>
          {formErrors.partOfConceptTypeId ? <span className="fileError">{formErrors.partOfConceptTypeId}</span> : null}
          <span className="hint">Set when this type exists as a component of another type.</span>
        </label>

        <label>
          Order Within Parent
          <input
            type="number"
            min={1}
            step={1}
            value={partOrder}
            onChange={(event) => {
              setPartOrder(event.target.value)
              clearFieldError('partOrder')
            }}
            placeholder="1"
            disabled={!partOfConceptTypeId}
          />
          {formErrors.partOrder ? <span className="fileError">{formErrors.partOrder}</span> : null}
          <span className="hint">
            Controls display order among siblings for the selected parent. Leave blank to use 1.
          </span>
        </label>

        <label>
          Reference To Concept Type
          <select
            value={referenceToConceptTypeId}
            onChange={(event) => {
              setReferenceToConceptTypeId(event.target.value)
              clearFieldError('referenceToConceptTypeId')
            }}
          >
            <option value="">(none)</option>
            {conceptTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.id})
              </option>
            ))}
          </select>
          {formErrors.referenceToConceptTypeId ? <span className="fileError">{formErrors.referenceToConceptTypeId}</span> : null}
          <span className="hint">Optional semantic reference. Requires a Part Of selection.</span>
        </label>

        <div className="actions">
          <button type="submit">{editingId ? 'Save' : 'Create'}</button>
          {editingId ? (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
