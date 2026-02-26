import type { ConceptTypeRecord } from '../csv/types'

export type ConceptTypeRowActions = {
  onCopyValue: (value: string, copiedValueKey: string) => Promise<void>
  onEdit: (conceptType: ConceptTypeRecord) => void
  onDelete: (id: string) => void
}

export type ConceptTypeFlatRowActions = ConceptTypeRowActions & {
  onToggleDescription: (id: string) => void
  onToggleUsage: (id: string) => void
}

export type ConceptTypeTreeRowActions = ConceptTypeRowActions & {
  onToggleDescription: (id: string) => void
  onMoveConceptType: (id: string, direction: 'up' | 'down') => void
}
