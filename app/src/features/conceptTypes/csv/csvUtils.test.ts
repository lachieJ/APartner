import { describe, expect, it } from 'vitest'
import type { ConceptTypeRecord } from './types'
import {
  buildConceptTypesCsv,
  parseCsvLine,
  parseImportCsv,
  toCsvCell,
} from './csvUtils'

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

describe('csvUtils', () => {
  it('parses quoted CSV cells with commas and escaped quotes', () => {
    const cells = parseCsvLine('"A, B","He said ""hi""",C')

    expect(cells).toEqual(['A, B', 'He said "hi"', 'C'])
  })

  it('requires name column when parsing import CSV', () => {
    const csv = ['description,partOfName', 'Some desc,Parent'].join('\n')

    expect(() => parseImportCsv(csv)).toThrow('CSV must include a name column.')
  })

  it('rejects invalid partOrder values', () => {
    const csv = ['name,partOrder', 'Capability,0'].join('\n')

    expect(() => parseImportCsv(csv)).toThrow('Row 2: partOrder must be a whole number greater than 0.')
  })

  it('parses alias headers and optional values', () => {
    const csv = [
      'conceptTypeName,description,partOfConceptTypeName,order,referenceToConceptType',
      'Capability,"A, B",Enterprise,2,Organisation',
    ].join('\n')

    const rows = parseImportCsv(csv)

    expect(rows).toEqual([
      {
        rowNumber: 2,
        name: 'Capability',
        description: 'A, B',
        partOfName: 'Enterprise',
        partOrder: 2,
        referenceToName: 'Organisation',
      },
    ])
  })

  it('quotes CSV output cells when needed', () => {
    expect(toCsvCell('hello')).toBe('hello')
    expect(toCsvCell('A, B')).toBe('"A, B"')
    expect(toCsvCell('He said "hi"')).toBe('"He said ""hi"""')
  })

  it('builds export CSV with parent and reference names', () => {
    const root = makeConceptType({ id: 'root', name: 'Enterprise' })
    const child = makeConceptType({
      id: 'child',
      name: 'Capability',
      description: 'Business ability',
      part_of_concept_type_id: 'root',
      part_order: 1,
      reference_to_concept_type_id: 'root',
    })

    const csv = buildConceptTypesCsv([root, child])

    expect(csv).toContain('name,description,partOfName,partOrder,referenceToName')
    expect(csv).toContain('Capability,Business ability,Enterprise,1,Enterprise')
  })
})
