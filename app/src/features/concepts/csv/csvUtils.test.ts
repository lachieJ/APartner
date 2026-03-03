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
  root_concept_id: overrides.root_concept_id ?? overrides.id ?? crypto.randomUUID(),
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
        conceptId: null,
        name: 'Stage A',
        description: 'Flow, stage',
        conceptTypeName: 'Value Stream',
        rootConceptId: null,
        partOfConceptId: null,
        partOfName: 'Treasury',
        partOrder: 2,
        referenceToConceptId: null,
        referenceToName: null,
      },
    ])
  })

  it('parses optional concept identifier columns', () => {
    const csv = [
      'conceptId,name,conceptTypeName,rootConceptId,partOfConceptId,partOrder,referenceToConceptId',
      'concept-1,Stage A,Value Stream,root-1,parent-1,2,ref-1',
    ].join('\n')

    const [row] = parseConceptImportCsv(csv)

    expect(row.conceptId).toBe('concept-1')
    expect(row.rootConceptId).toBe('root-1')
    expect(row.partOfConceptId).toBe('parent-1')
    expect(row.referenceToConceptId).toBe('ref-1')
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

    expect(csv).toContain('conceptId,name,description,conceptTypeName,rootConceptId,partOfConceptId,partOfName,partOrder,referenceToConceptId,referenceToName')
    expect(csv).toContain('concept-stage-a,Stage A,,Value Stream,concept-stage-a,concept-treasury,Treasury,1,,')
  })

  it('builds import error CSV including partOrder values', () => {
    const csv = buildConceptImportErrorsCsv([
      {
        rowNumber: 4,
        conceptId: 'concept-stage-b',
        name: 'Stage B',
        conceptTypeName: 'Value Stream',
        rootConceptId: 'root-1',
        partOfConceptId: 'parent-1',
        partOfName: 'Treasury',
        partOrder: 3,
        referenceToConceptId: 'ref-1',
        referenceToName: null,
        error: 'PartOf target not found.',
      },
    ])

    expect(csv).toContain('rowNumber,conceptId,name,conceptTypeName,rootConceptId,partOfConceptId,partOfName,partOrder,referenceToConceptId,referenceToName,error')
    expect(csv).toContain('4,concept-stage-b,Stage B,Value Stream,root-1,parent-1,Treasury,3,ref-1,,PartOf target not found.')
  })
})
