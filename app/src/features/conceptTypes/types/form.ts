export type ConceptTypeFormErrors = {
  name?: string
  partOfConceptTypeId?: string
  partOrder?: string
  referenceToConceptTypeId?: string
}

export type ConceptTypeFormErrorField = keyof ConceptTypeFormErrors
