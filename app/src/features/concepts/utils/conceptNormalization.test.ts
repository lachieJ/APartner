import { describe, expect, it } from 'vitest'
import { normalizeConceptLookupValue } from './conceptNormalization'

describe('conceptNormalization', () => {
  it('normalizes casing and trims edge whitespace', () => {
    expect(normalizeConceptLookupValue('  Value Stream  ')).toBe('value stream')
    expect(normalizeConceptLookupValue('BUSINESS MODEL')).toBe('business model')
  })

  it('preserves interior spacing while normalizing', () => {
    expect(normalizeConceptLookupValue('Value   Proposition')).toBe('value   proposition')
  })
})
