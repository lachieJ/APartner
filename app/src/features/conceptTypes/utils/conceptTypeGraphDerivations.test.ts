import { describe, expect, it } from 'vitest'
import type { ConceptTypeRecord } from '../csv/types'
import {
  buildChildrenByParentId,
  buildConceptById,
  buildInboundUsageByConceptId,
  buildIssueSummary,
  getAffectedConceptTypeIds,
  getDisplayedConceptTypes,
  getRootOptions,
} from './conceptTypeGraphDerivations'

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

describe('conceptTypeGraphDerivations', () => {
  const root = makeConceptType({ id: 'root', name: 'Root' })
  const childA = makeConceptType({ id: 'a', name: 'A', part_of_concept_type_id: 'root', part_order: 3 })
  const childB = makeConceptType({ id: 'b', name: 'B', part_of_concept_type_id: 'root', part_order: 1 })
  const orphanPart = makeConceptType({ id: 'orph', name: 'Orphan', part_of_concept_type_id: 'missing-parent' })
  const brokenRef = makeConceptType({ id: 'ref', name: 'BrokenRef', reference_to_concept_type_id: 'missing-ref' })

  const conceptTypes = [root, childA, childB, orphanPart, brokenRef]

  it('filters root options when top-level only is enabled', () => {
    const topLevelOnly = getRootOptions(conceptTypes, true)
    const all = getRootOptions(conceptTypes, false)

    expect(topLevelOnly.map((item) => item.id)).toEqual(['root', 'ref'])
    expect(all).toHaveLength(conceptTypes.length)
  })

  it('sorts children by part_order then name', () => {
    const childrenByParent = buildChildrenByParentId(conceptTypes)

    expect(childrenByParent.get('root')?.map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('builds inbound usage map', () => {
    const usage = buildInboundUsageByConceptId(conceptTypes)

    expect(usage.get('root')?.usedAsPartOfBy.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('detects relationship and sibling-order issues and derives affected ids', () => {
    const conceptById = buildConceptById(conceptTypes)
    const childrenByParent = buildChildrenByParentId(conceptTypes)
    const issueSummary = buildIssueSummary(conceptTypes, conceptById, childrenByParent)

    expect(issueSummary.orphanPartOf.map((item) => item.id)).toEqual(['orph'])
    expect(issueSummary.brokenReferenceTo.map((item) => item.id)).toEqual(['ref'])
    expect(issueSummary.siblingOrderIssueParents.map((item) => item.parentId)).toContain('root')
    expect(issueSummary.siblingOrderIssueParents.map((item) => item.parentId)).toContain('missing-parent')

    const affected = getAffectedConceptTypeIds(issueSummary, childrenByParent)
    expect(Array.from(affected).sort()).toEqual(['a', 'b', 'orph', 'ref'])
  })

  it('filters displayed concept types when issues-only mode is on', () => {
    const affected = new Set<string>(['a', 'ref'])

    const allDisplayed = getDisplayedConceptTypes(conceptTypes, affected, false)
    const issuesOnlyDisplayed = getDisplayedConceptTypes(conceptTypes, affected, true)

    expect(allDisplayed).toHaveLength(conceptTypes.length)
    expect(issuesOnlyDisplayed.map((item) => item.id)).toEqual(['a', 'ref'])
  })
})
