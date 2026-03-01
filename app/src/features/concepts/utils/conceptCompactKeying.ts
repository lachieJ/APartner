export { getCompactRootDraftKey } from './conceptRootSemantics'

export function getCompactDraftKey(parentConceptId: string, childConceptTypeId: string): string {
  return `${parentConceptId}::${childConceptTypeId}`
}

export function getCompactReferenceCreateKeyForEdit(conceptId: string): string {
  return `edit-ref::${conceptId}`
}

export function getCompactReferenceCreateKeyForAdd(parentConceptId: string, childConceptTypeId: string): string {
  return `add-ref::${parentConceptId}::${childConceptTypeId}`
}

export function getCompactPendingSelectionKeyForEdit(conceptId: string): string {
  return `edit::${conceptId}`
}

export function getCompactPendingSelectionKeyForAdd(parentConceptId: string, childConceptTypeId: string): string {
  return `add::${parentConceptId}::${childConceptTypeId}`
}

export type CompactPendingSelectionScope =
  | { kind: 'add'; scopedKey: string }
  | { kind: 'edit'; conceptId: string }

export function getCompactPendingSelectionKeyFromReferencePanelKey(panelKey: string): string | null {
  if (panelKey.startsWith('edit-ref::')) {
    const conceptId = panelKey.replace('edit-ref::', '')
    if (!conceptId) {
      return null
    }

    return getCompactPendingSelectionKeyForEdit(conceptId)
  }

  if (panelKey.startsWith('add-ref::')) {
    const [parentConceptId, childConceptTypeId] = panelKey.replace('add-ref::', '').split('::') as [string, string]
    if (!parentConceptId || !childConceptTypeId) {
      return null
    }

    return getCompactPendingSelectionKeyForAdd(parentConceptId, childConceptTypeId)
  }

  return null
}

export function parseCompactPendingSelectionKey(pendingKey: string): CompactPendingSelectionScope | null {
  if (pendingKey.startsWith('add::')) {
    const scopedKey = pendingKey.replace('add::', '')
    if (!scopedKey) {
      return null
    }

    return {
      kind: 'add',
      scopedKey,
    }
  }

  if (pendingKey.startsWith('edit::')) {
    const conceptId = pendingKey.replace('edit::', '')
    if (!conceptId) {
      return null
    }

    return {
      kind: 'edit',
      conceptId,
    }
  }

  return null
}
