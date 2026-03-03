import { describe, expect, it } from 'vitest'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import {
  buildChildrenByParentId,
  buildConceptById,
  getConceptTypeById,
  getConceptTypeNameById,
  getDisplayedConcepts,
  getRootConcepts,
} from './conceptModelViewDerivations'

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

describe('conceptModelViewDerivations', () => {
  const root = makeConcept({ id: 'root', name: 'Root', concept_type_id: 'type-root' })
  const alpha = makeConcept({ id: 'alpha', name: 'Alpha', concept_type_id: 'type-child', part_of_concept_id: 'root', part_order: 2 })
  const beta = makeConcept({ id: 'beta', name: 'Beta', concept_type_id: 'type-child', part_of_concept_id: 'root', part_order: 1 })
  const orphan = makeConcept({ id: 'orph', name: 'Orphan', concept_type_id: 'type-child', part_of_concept_id: 'missing-parent' })
  const concepts = [root, alpha, beta, orphan]

  const conceptTypes = [
    makeConceptType({ id: 'type-root', name: 'RootType' }),
    makeConceptType({ id: 'type-child', name: 'ChildType' }),
  ]

  it('builds lookup maps for concept and concept type identities', () => {
    const conceptById = buildConceptById(concepts)
    const conceptTypeById = getConceptTypeById(conceptTypes)
    const conceptTypeNameById = getConceptTypeNameById(conceptTypes)

    expect(conceptById.get('root')?.name).toBe('Root')
    expect(conceptTypeById.get('type-child')?.name).toBe('ChildType')
    expect(conceptTypeNameById.get('type-root')).toBe('RootType')
  })

  it('filters displayed concepts only when issues-only mode is enabled', () => {
    const affected = new Set<string>(['alpha', 'orph'])

    const allDisplayed = getDisplayedConcepts(concepts, affected, false)
    const issuesOnlyDisplayed = getDisplayedConcepts(concepts, affected, true)

    expect(allDisplayed.map((item) => item.id)).toEqual(['root', 'alpha', 'beta', 'orph'])
    expect(issuesOnlyDisplayed.map((item) => item.id)).toEqual(['alpha', 'orph'])
  })

  it('groups children by parent and orders siblings by part_order then name', () => {
    const childrenByParent = buildChildrenByParentId(concepts)

    expect(childrenByParent.get('root')?.map((item) => item.id)).toEqual(['beta', 'alpha'])
    expect(childrenByParent.get('missing-parent')?.map((item) => item.id)).toEqual(['orph'])
  })

  it('derives root concepts as top-level and missing-parent concepts in stable order', () => {
    const conceptById = buildConceptById(concepts)
    const roots = getRootConcepts(concepts, conceptById)

    expect(roots.map((item) => item.id)).toEqual(['orph', 'root'])
  })
})