import { describe, expect, it } from 'vitest'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import { deriveChildTypeNodeState, getReferenceOptions, getReferenceTypeName } from './conceptCompactBranchHelpers'

const makeConcept = (overrides: Partial<ConceptRecord>): ConceptRecord => ({
  id: overrides.id ?? 'concept-id',
  name: overrides.name ?? 'Unnamed Concept',
  description: overrides.description ?? null,
  concept_type_id: overrides.concept_type_id ?? 'type-default',
  part_of_concept_id: overrides.part_of_concept_id ?? null,
  part_order: overrides.part_order ?? null,
  reference_to_concept_id: overrides.reference_to_concept_id ?? null,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
})

const makeConceptType = (overrides: Partial<ConceptTypeRecord>): ConceptTypeRecord => ({
  id: overrides.id ?? 'type-id',
  name: overrides.name ?? 'Unnamed Type',
  description: overrides.description ?? null,
  part_of_concept_type_id: overrides.part_of_concept_type_id ?? null,
  part_order: overrides.part_order ?? null,
  reference_to_concept_type_id: overrides.reference_to_concept_type_id ?? null,
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
})

describe('conceptCompactBranchHelpers', () => {
  it('returns empty options when reference type is missing', () => {
    const concepts = [makeConcept({ id: 'a', name: 'Alpha', concept_type_id: 'type-a' })]

    expect(getReferenceOptions(concepts, null)).toEqual([])
  })

  it('filters and sorts reference options by concept type and name', () => {
    const concepts = [
      makeConcept({ id: '3', name: 'Zulu', concept_type_id: 'target-type' }),
      makeConcept({ id: '1', name: 'Beta', concept_type_id: 'other-type' }),
      makeConcept({ id: '2', name: 'Alpha', concept_type_id: 'target-type' }),
    ]

    const options = getReferenceOptions(concepts, 'target-type')

    expect(options.map((item) => item.id)).toEqual(['2', '3'])
  })

  it('resolves reference type name and falls back to id when missing', () => {
    const conceptTypeById = new Map<string, ConceptTypeRecord>([
      ['known-type', makeConceptType({ id: 'known-type', name: 'Known Type' })],
    ])

    expect(getReferenceTypeName(conceptTypeById, null)).toBe('reference')
    expect(getReferenceTypeName(conceptTypeById, 'known-type')).toBe('Known Type')
    expect(getReferenceTypeName(conceptTypeById, 'unknown-type')).toBe('unknown-type')
  })

  it('derives child-type node state using existing drafts and references', () => {
    const parentConceptId = 'parent-1'
    const childType = makeConceptType({ id: 'child-type', reference_to_concept_type_id: 'ref-type' })
    const concepts = [
      makeConcept({ id: 'child-1', concept_type_id: 'child-type', part_of_concept_id: 'parent-1' }),
      makeConcept({ id: 'child-2', concept_type_id: 'other-type', part_of_concept_id: 'parent-1' }),
      makeConcept({ id: 'ref-a', name: 'Zulu', concept_type_id: 'ref-type' }),
      makeConcept({ id: 'ref-b', name: 'Alpha', concept_type_id: 'ref-type' }),
    ]

    const conceptTypeById = new Map<string, ConceptTypeRecord>([
      ['ref-type', makeConceptType({ id: 'ref-type', name: 'Reference Type' })],
      ['parent-type', makeConceptType({ id: 'parent-type', name: 'Parent Type' })],
    ])

    const childState = deriveChildTypeNodeState({
      parentConceptId,
      childType,
      concepts,
      conceptTypeById,
      childrenByParentConceptId: new Map<string, ConceptRecord[]>([[parentConceptId, concepts]]),
      createDraftByParentTypeKey: {
        'parent-1::child-type': { name: 'Draft Child', description: 'Draft Desc', referenceToConceptId: 'ref-a' },
      },
      addPanelByParentTypeKey: {
        'parent-1::child-type': true,
      },
      quickReferenceCreateDraftByKey: {
        'ref-parent-1::child-type': { name: 'Ref Draft', description: 'Ref Desc', parentConceptId: 'parent-ref' },
      },
      getDraftKey: (pId, cId) => `${pId}::${cId}`,
      getReferenceCreateKeyForAdd: (pId, cId) => `ref-${pId}::${cId}`,
      getReferenceCreationParentOptions: () => ({
        expectedParentTypeId: 'parent-type',
        requiresParentSelection: true,
        parentOptions: [makeConcept({ id: 'parent-ref', name: 'Parent Ref', concept_type_id: 'parent-type' })],
      }),
    })

    expect(childState.requiredReferenceTypeId).toBe('ref-type')
    expect(childState.referenceOptions.map((item) => item.id)).toEqual(['ref-b', 'ref-a'])
    expect(childState.childConcepts.map((item) => item.id)).toEqual(['child-1'])
    expect(childState.createDraft.name).toBe('Draft Child')
    expect(childState.addPanelOpen).toBe(true)
    expect(childState.referenceCreatePanelKey).toBe('ref-parent-1::child-type')
    expect(childState.referenceCreateDraft.name).toBe('Ref Draft')
    expect(childState.requiredReferenceTypeName).toBe('Reference Type')
    expect(childState.expectedParentTypeName).toBe('Parent Type')
  })

  it('derives child-type node defaults when no draft or reference type exists', () => {
    const childType = makeConceptType({ id: 'child-type', reference_to_concept_type_id: null })

    const childState = deriveChildTypeNodeState({
      parentConceptId: 'parent-1',
      childType,
      concepts: [],
      conceptTypeById: new Map<string, ConceptTypeRecord>(),
      childrenByParentConceptId: new Map<string, ConceptRecord[]>(),
      createDraftByParentTypeKey: {},
      addPanelByParentTypeKey: {},
      quickReferenceCreateDraftByKey: {},
      getDraftKey: (pId, cId) => `${pId}::${cId}`,
      getReferenceCreateKeyForAdd: (pId, cId) => `ref-${pId}::${cId}`,
      getReferenceCreationParentOptions: () => ({
        expectedParentTypeId: null,
        requiresParentSelection: false,
        parentOptions: [],
      }),
    })

    expect(childState.requiredReferenceTypeId).toBeNull()
    expect(childState.referenceOptions).toEqual([])
    expect(childState.childConcepts).toEqual([])
    expect(childState.createDraft).toEqual({ name: '', description: '', referenceToConceptId: '' })
    expect(childState.addPanelOpen).toBe(false)
    expect(childState.referenceCreateDraft).toEqual({ name: '', description: '', parentConceptId: '' })
    expect(childState.referenceCreation).toEqual({
      expectedParentTypeId: null,
      requiresParentSelection: false,
      parentOptions: [],
    })
    expect(childState.requiredReferenceTypeName).toBe('reference')
    expect(childState.expectedParentTypeName).toBe('(none)')
  })
})
