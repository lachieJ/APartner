import { describe, expect, it } from 'vitest'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import {
  getCompactRootDraftKey,
  getRootConceptsForType,
  getRootOrDecomposableConceptTypes,
  isRootConcept,
  isRootOrDecomposableConceptType,
} from './conceptRootSemantics'

const makeConceptType = (overrides: Partial<ConceptTypeRecord>): ConceptTypeRecord => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Unnamed Type',
  description: overrides.description ?? null,
  part_of_concept_type_id: overrides.part_of_concept_type_id ?? null,
  part_order: overrides.part_order ?? null,
  reference_to_concept_type_id: overrides.reference_to_concept_type_id ?? null,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
})

const makeConcept = (overrides: Partial<ConceptRecord>): ConceptRecord => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Unnamed Concept',
  description: overrides.description ?? null,
  concept_type_id: overrides.concept_type_id ?? 'type-default',
  root_concept_id: overrides.root_concept_id ?? overrides.id ?? crypto.randomUUID(),
  part_of_concept_id: overrides.part_of_concept_id ?? null,
  part_order: overrides.part_order ?? null,
  reference_to_concept_id: overrides.reference_to_concept_id ?? null,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
})

describe('conceptRootSemantics', () => {
  it('builds the canonical compact root draft key', () => {
    expect(getCompactRootDraftKey('type-root')).toBe('ROOT::type-root')
    expect(getCompactRootDraftKey('')).toBe('ROOT::')
  })

  it('classifies root-or-decomposable concept types', () => {
    expect(isRootOrDecomposableConceptType(makeConceptType({ id: 'a', part_of_concept_type_id: null }))).toBe(true)
    expect(isRootOrDecomposableConceptType(makeConceptType({ id: 'a', part_of_concept_type_id: 'a' }))).toBe(true)
    expect(isRootOrDecomposableConceptType(makeConceptType({ id: 'a', part_of_concept_type_id: 'b' }))).toBe(false)
  })

  it('derives ordered root-or-decomposable type options', () => {
    const types = [
      makeConceptType({ id: 'child', name: 'Child', part_of_concept_type_id: 'parent', part_order: 3 }),
      makeConceptType({ id: 'root-b', name: 'Root B', part_of_concept_type_id: null, part_order: 2 }),
      makeConceptType({ id: 'root-a', name: 'Root A', part_of_concept_type_id: 'root-a', part_order: 1 }),
    ]

    const options = getRootOrDecomposableConceptTypes(types)

    expect(options.map((item) => item.id)).toEqual(['root-a', 'root-b'])
  })

  it('classifies root concepts', () => {
    expect(isRootConcept(makeConcept({ id: 'root-1', part_of_concept_id: null }))).toBe(true)
    expect(isRootConcept(makeConcept({ id: 'child-1', part_of_concept_id: 'root-1' }))).toBe(false)
  })

  it('derives root concepts for a selected type in stable order', () => {
    const concepts = [
      makeConcept({ id: 'a', name: 'A', concept_type_id: 'type-1', part_of_concept_id: null, part_order: 2 }),
      makeConcept({ id: 'b', name: 'B', concept_type_id: 'type-1', part_of_concept_id: null, part_order: 1 }),
      makeConcept({ id: 'c', name: 'C', concept_type_id: 'type-1', part_of_concept_id: 'b', part_order: 1 }),
      makeConcept({ id: 'd', name: 'D', concept_type_id: 'type-2', part_of_concept_id: null, part_order: 1 }),
    ]

    expect(getRootConceptsForType(concepts, 'type-1').map((item) => item.id)).toEqual(['b', 'a'])
    expect(getRootConceptsForType(concepts, '').map((item) => item.id)).toEqual([])
  })
})
