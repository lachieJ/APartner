import { describe, expect, it } from 'vitest'
import { getConceptTypeAndNameKey } from './conceptIdentityKeying'

describe('conceptIdentityKeying', () => {
  it('builds stable type-and-name keys', () => {
    expect(getConceptTypeAndNameKey('type-a', 'Alpha')).toBe('type-a::alpha')
    expect(getConceptTypeAndNameKey('type-a', '  Alpha  ')).toBe('type-a::alpha')
  })

  it('normalizes case and preserves internal spaces', () => {
    expect(getConceptTypeAndNameKey('type-a', 'Value Stream')).toBe('type-a::value stream')
    expect(getConceptTypeAndNameKey('type-a', 'VALUE stream')).toBe('type-a::value stream')
  })
})
