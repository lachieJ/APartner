import { describe, expect, it } from 'vitest'
import {
  getCompactDraftKey,
  getCompactRootDraftKey,
  getCompactPendingSelectionKeyForAdd,
  getCompactPendingSelectionKeyForEdit,
  getCompactPendingSelectionKeyFromReferencePanelKey,
  getCompactReferenceCreateKeyForAdd,
  getCompactReferenceCreateKeyForEdit,
  parseCompactPendingSelectionKey,
} from './conceptCompactKeying'

describe('conceptCompactKeying', () => {
  it('builds canonical compact keys', () => {
    expect(getCompactDraftKey('parent-1', 'child-type')).toBe('parent-1::child-type')
    expect(getCompactRootDraftKey('type-root')).toBe('ROOT::type-root')
    expect(getCompactRootDraftKey('')).toBe('ROOT::')
    expect(getCompactReferenceCreateKeyForEdit('concept-1')).toBe('edit-ref::concept-1')
    expect(getCompactReferenceCreateKeyForAdd('parent-1', 'child-type')).toBe('add-ref::parent-1::child-type')
    expect(getCompactPendingSelectionKeyForEdit('concept-1')).toBe('edit::concept-1')
    expect(getCompactPendingSelectionKeyForAdd('parent-1', 'child-type')).toBe('add::parent-1::child-type')
  })

  it('converts reference panel keys to pending selection keys', () => {
    expect(getCompactPendingSelectionKeyFromReferencePanelKey('edit-ref::concept-1')).toBe('edit::concept-1')
    expect(getCompactPendingSelectionKeyFromReferencePanelKey('add-ref::parent-1::child-type')).toBe(
      'add::parent-1::child-type',
    )
  })

  it('returns null for unsupported or malformed panel keys', () => {
    expect(getCompactPendingSelectionKeyFromReferencePanelKey('something-else')).toBeNull()
    expect(getCompactPendingSelectionKeyFromReferencePanelKey('add-ref::missing-child-type')).toBeNull()
    expect(getCompactPendingSelectionKeyFromReferencePanelKey('edit-ref::')).toBeNull()
  })

  it('parses compact pending selection keys', () => {
    expect(parseCompactPendingSelectionKey('add::parent-1::child-type')).toEqual({
      kind: 'add',
      scopedKey: 'parent-1::child-type',
    })
    expect(parseCompactPendingSelectionKey('edit::concept-1')).toEqual({
      kind: 'edit',
      conceptId: 'concept-1',
    })
  })

  it('returns null for malformed pending selection keys', () => {
    expect(parseCompactPendingSelectionKey('add::')).toBeNull()
    expect(parseCompactPendingSelectionKey('edit::')).toBeNull()
    expect(parseCompactPendingSelectionKey('unknown::value')).toBeNull()
  })
})
