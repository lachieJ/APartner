import { describe, expect, it } from 'vitest'
import type { ConceptTypeRecord } from '../csv/types'
import {
  getConceptTypeUsage,
  getCopyIdKey,
  getCopyNameKey,
  type ConceptTypeUsage,
} from './conceptTypeRowHelpers'

const makeConceptType = (overrides: Partial<ConceptTypeRecord>): ConceptTypeRecord => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Unnamed',
  description: overrides.description ?? null,
  part_of_concept_type_id: overrides.part_of_concept_type_id ?? null,
  part_order: overrides.part_order ?? null,
  reference_to_concept_type_id: overrides.reference_to_concept_type_id ?? null,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
})

describe('conceptTypeRowHelpers', () => {
  it('returns usage map entry when present', () => {
    const partOfRef = makeConceptType({ id: 'part-user', name: 'Part User' })
    const referenceRef = makeConceptType({ id: 'ref-user', name: 'Reference User' })

    const usageMap = new Map<string, ConceptTypeUsage>([
      [
        'a',
        {
          usedAsPartOfBy: [partOfRef],
          usedAsReferenceToBy: [referenceRef],
        },
      ],
    ])

    const usage = getConceptTypeUsage(usageMap, 'a')

    expect(usage.usedAsPartOfBy).toHaveLength(1)
    expect(usage.usedAsReferenceToBy).toHaveLength(1)
  })

  it('returns empty usage when concept is missing', () => {
    const usage = getConceptTypeUsage(new Map(), 'missing')

    expect(usage.usedAsPartOfBy).toHaveLength(0)
    expect(usage.usedAsReferenceToBy).toHaveLength(0)
  })

  it('builds stable copy keys', () => {
    expect(getCopyIdKey('abc')).toBe('id:abc')
    expect(getCopyNameKey('abc')).toBe('name:abc')
  })
})
