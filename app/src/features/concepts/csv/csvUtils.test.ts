import { describe, expect, it } from 'vitest'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import {
  buildConceptImportErrorsCsv,
  buildConceptsCsv,
  parseConceptImportCsv,
} from './csvUtils'

const makeConceptType = (overrides: Partial<ConceptTypeRecord>): ConceptTypeRecord => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Unnamed type',
  description: overrides.description ?? null,
  part_of_concept_type_id: overrides.part_of_concept_type_id ?? null,
  part_order: overrides.part_order ?? null,
  reference_to_concept_type_id: overrides.reference_to_concept_type_id ?? null,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
})

const makeConcept = (overrides: Partial<ConceptRecord>): ConceptRecord => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Unnamed concept',
  description: overrides.description ?? null,
  concept_type_id: overrides.concept_type_id ?? 'type-root',
  part_of_concept_id: overrides.part_of_concept_id ?? null,
  part_order: overrides.part_order ?? null,
  reference_to_concept_id: overrides.reference_to_concept_id ?? null,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
})

describe('concept csvUtils', () => {
  it('requires conceptTypeName column for import parsing', () => {
    const csv = ['name,description,partOfName', 'Tax Administration,Core stream,Treasury'].join('\n')

    expect(() => parseConceptImportCsv(csv)).toThrow('CSV must include a conceptTypeName column.')
  })

  it('rejects invalid partOrder values', () => {
    const csv = ['name,conceptTypeName,partOfName,partOrder', 'Stage A,Value Stream,Treasury,0'].join('\n')

    expect(() => parseConceptImportCsv(csv)).toThrow('Row 2: partOrder must be a whole number greater than 0.')
  })

  it('parses optional partOrder aliases and quoted values', () => {
    const csv = [
      'conceptName,description,type,partOfConceptName,order,referenceToConceptName',
      'Stage A,"Flow, stage",Value Stream,Treasury,2,',
    ].join('\n')

    const rows = parseConceptImportCsv(csv)

    expect(rows).toEqual([
      {
        rowNumber: 2,
        name: 'Stage A',
        description: 'Flow, stage',
        conceptTypeName: 'Value Stream',
        partOfName: 'Treasury',
        partOrder: 2,
        referenceToName: null,
      },
    ])
  })

  it('builds export CSV including partOrder values', () => {
    const enterpriseType = makeConceptType({ id: 'type-enterprise', name: 'Enterprise' })
    const valueStreamType = makeConceptType({ id: 'type-value-stream', name: 'Value Stream' })

    const treasury = makeConcept({
      id: 'concept-treasury',
      name: 'Treasury',
      concept_type_id: enterpriseType.id,
    })

    const stageA = makeConcept({
      id: 'concept-stage-a',
      name: 'Stage A',
      concept_type_id: valueStreamType.id,
      part_of_concept_id: treasury.id,
      part_order: 1,
    })

    const csv = buildConceptsCsv([treasury, stageA], [enterpriseType, valueStreamType])

    expect(csv).toContain('name,description,conceptTypeName,partOfName,partOrder,referenceToName')
    expect(csv).toContain('Stage A,,Value Stream,Treasury,1,')
  })

  it('builds import error CSV including partOrder values', () => {
    const csv = buildConceptImportErrorsCsv([
      {
        rowNumber: 4,
        name: 'Stage B',
        conceptTypeName: 'Value Stream',
        partOfName: 'Treasury',
        partOrder: 3,
        referenceToName: null,
        error: 'PartOf target not found.',
      },
    ])

    expect(csv).toContain('rowNumber,name,conceptTypeName,partOfName,partOrder,referenceToName,error')
    expect(csv).toContain('4,Stage B,Value Stream,Treasury,3,,PartOf target not found.')
  })
})
