import { supabase } from '../../../supabaseClient'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptImportFailure, ConceptImportRow, ConceptImportSummary } from '../csv/types'
import type { ConceptPayload, ConceptRecord } from '../types'
import { getConceptTypeAndNameKey, normalizeConceptLookupValue } from '../utils/conceptConventions'

type DbErrorShape = {
  message: string
  code?: string
  details?: string
  hint?: string
}

export type ConceptRemediationAuditPayload = {
  actionKind: string
  reason: string | null
  partOfClearedCount: number
  referenceToClearedCount: number
  affectedConceptIds: string[]
}

export type ConceptRemediationAuditRecord = {
  id: string
  action_kind: string
  reason: string | null
  part_of_cleared_count: number
  reference_to_cleared_count: number
  affected_concept_ids: string[]
  created_by: string
  created_at: string
}

const friendlyConceptError = (raw: string, code?: string, details?: string, hint?: string) => {
  const merged = [raw, details ?? '', hint ?? ''].join(' | ')

  if (code === '23505' || merged.includes('uq_concept_name_ci_per_type')) {
    return 'Name must be unique within the selected MetaModel type (case-insensitive).'
  }

  if (code === '23503') {
    if (merged.includes('concept_type_id')) {
      return 'MetaModel type does not exist.'
    }
    if (merged.includes('part_of_concept_id')) {
      return 'PartOf concept does not exist.'
    }
    if (merged.includes('reference_to_concept_id')) {
      return 'ReferenceTo concept does not exist.'
    }
    return 'A referenced record does not exist.'
  }

  if (code === '23514') {
    if (merged.includes('chk_concept_name_not_blank')) {
      return 'Name is required.'
    }
    if (merged.includes('chk_concept_not_self_partof')) {
      return 'PartOf cannot reference itself.'
    }
    if (merged.includes('chk_concept_not_self_reference')) {
      return 'ReferenceTo cannot reference itself.'
    }
    if (merged.includes('chk_concept_part_order_positive')) {
      return 'Order within parent must be a whole number greater than 0.'
    }
    if (merged.includes('chk_concept_part_order_requires_partof')) {
      return 'Order within parent requires PartOf concept.'
    }
  }

  if (code === 'P0001') {
    return raw
  }

  if (code && code.startsWith('23')) {
    return `Save failed due to a data integrity rule (${code}). ${raw}`
  }

  return raw || 'Save failed due to an unexpected database error.'
}

const fromDbError = (error: DbErrorShape) => friendlyConceptError(error.message, error.code, error.details, error.hint)

export const listConcepts = async (): Promise<{ data: ConceptRecord[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('concept')
    .select('id,name,description,concept_type_id,root_concept_id,part_of_concept_id,part_order,reference_to_concept_id,created_at,updated_at')
    .order('part_of_concept_id', { ascending: true, nullsFirst: true })
    .order('part_order', { ascending: true, nullsFirst: true })
    .order('name', { ascending: true })

  if (error) {
    return { data: [], error: fromDbError(error) }
  }

  return { data: data ?? [], error: null }
}

export const createConcept = async (payload: ConceptPayload): Promise<string | null> => {
  const { error } = await supabase.from('concept').insert(payload)
  return error ? fromDbError(error) : null
}

export const createConceptWithRecord = async (
  payload: ConceptPayload,
): Promise<{ data: ConceptRecord | null; error: string | null }> => {
  const { data, error } = await supabase
    .from('concept')
    .insert(payload)
    .select('id,name,description,concept_type_id,root_concept_id,part_of_concept_id,part_order,reference_to_concept_id,created_at,updated_at')
    .single()

  if (error) {
    return { data: null, error: fromDbError(error) }
  }

  return { data: data ?? null, error: null }
}

export const updateConcept = async (id: string, payload: ConceptPayload): Promise<string | null> => {
  const { error } = await supabase.from('concept').update(payload).eq('id', id)
  return error ? fromDbError(error) : null
}

export const updateConceptPartOrder = async (id: string, partOrder: number | null): Promise<string | null> => {
  const { error } = await supabase.from('concept').update({ part_order: partOrder }).eq('id', id)
  return error ? fromDbError(error) : null
}

export const deleteConcept = async (id: string): Promise<string | null> => {
  const { error } = await supabase.from('concept').delete().eq('id', id)
  return error ? fromDbError(error) : null
}

export const clearConceptPartOfLink = async (id: string): Promise<string | null> => {
  const { error } = await supabase.from('concept').update({ part_of_concept_id: null }).eq('id', id)
  return error ? fromDbError(error) : null
}

export const clearConceptReferenceToLink = async (id: string): Promise<string | null> => {
  const { error } = await supabase.from('concept').update({ reference_to_concept_id: null }).eq('id', id)
  return error ? fromDbError(error) : null
}

export const clearConceptPartOfLinksBulk = async (ids: string[]): Promise<string | null> => {
  if (ids.length === 0) {
    return null
  }

  const { error } = await supabase.from('concept').update({ part_of_concept_id: null }).in('id', ids)
  return error ? fromDbError(error) : null
}

export const clearConceptReferenceToLinksBulk = async (ids: string[]): Promise<string | null> => {
  if (ids.length === 0) {
    return null
  }

  const { error } = await supabase.from('concept').update({ reference_to_concept_id: null }).in('id', ids)
  return error ? fromDbError(error) : null
}

export const clearConceptLinksBulk = async (
  partOfIds: string[],
  referenceToIds: string[],
): Promise<string | null> => {
  if (partOfIds.length > 0) {
    const { error: partOfError } = await supabase
      .from('concept')
      .update({ part_of_concept_id: null })
      .in('id', partOfIds)

    if (partOfError) {
      return fromDbError(partOfError)
    }
  }

  if (referenceToIds.length > 0) {
    const { error: referenceToError } = await supabase
      .from('concept')
      .update({ reference_to_concept_id: null })
      .in('id', referenceToIds)

    if (referenceToError) {
      return fromDbError(referenceToError)
    }
  }

  return null
}

export const insertConceptRemediationAudit = async (
  payload: ConceptRemediationAuditPayload,
): Promise<string | null> => {
  const uniqueAffectedIds = Array.from(new Set(payload.affectedConceptIds))

  const { error } = await supabase.from('concept_remediation_audit').insert({
    action_kind: payload.actionKind,
    reason: payload.reason,
    part_of_cleared_count: payload.partOfClearedCount,
    reference_to_cleared_count: payload.referenceToClearedCount,
    affected_concept_ids: uniqueAffectedIds,
  })

  return error ? fromDbError(error) : null
}

export const listConceptRemediationAudits = async (
  limit = 30,
): Promise<{ data: ConceptRemediationAuditRecord[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('concept_remediation_audit')
    .select(
      'id,action_kind,reason,part_of_cleared_count,reference_to_cleared_count,affected_concept_ids,created_by,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: [], error: fromDbError(error) }
  }

  return { data: data ?? [], error: null }
}

export const importConceptRows = async (
  rows: ConceptImportRow[],
  conceptTypes: ConceptTypeRecord[],
  existingConcepts: ConceptRecord[],
): Promise<{ summary: ConceptImportSummary; fatalError: string | null }> => {
  const conceptTypeByName = new Map(
    conceptTypes.map((conceptType) => [normalizeConceptLookupValue(conceptType.name), conceptType]),
  )

  const buildFailure = (row: ConceptImportRow, error: string): ConceptImportFailure => ({
    rowNumber: row.rowNumber,
    conceptId: row.conceptId,
    name: row.name,
    conceptTypeName: row.conceptTypeName,
    rootConceptId: row.rootConceptId,
    rootConceptName: row.rootConceptName,
    partOfConceptId: row.partOfConceptId,
    partOfName: row.partOfName,
    partOrder: row.partOrder,
    referenceToConceptId: row.referenceToConceptId,
    referenceToName: row.referenceToName,
    error,
  })

  const indexByTypeAndName = (concepts: ConceptRecord[]) => {
    const index = new Map<string, ConceptRecord[]>()

    for (const concept of concepts) {
      const key = getConceptTypeAndNameKey(concept.concept_type_id, concept.name)
      const values = index.get(key) ?? []
      values.push(concept)
      index.set(key, values)
    }

    return index
  }

  const getScopedCandidates = (
    byTypeAndName: Map<string, ConceptRecord[]>,
    conceptTypeId: string,
    name: string,
    rootConceptId: string | null,
  ): ConceptRecord[] => {
    const key = getConceptTypeAndNameKey(conceptTypeId, name)
    const candidates = byTypeAndName.get(key) ?? []
    if (!rootConceptId) {
      return candidates
    }

    return candidates.filter((candidate) => candidate.root_concept_id === rootConceptId)
  }

  const existingByTypeAndName = indexByTypeAndName(existingConcepts)
  const existingById = new Map(existingConcepts.map((concept) => [concept.id, concept]))

  const failures: ConceptImportFailure[] = []
  const failedRowNumbers = new Set<number>()
  const createPayload: Array<{ id?: string; name: string; description: string | null; concept_type_id: string }> = []
  const seenCreateKeys = new Set<string>()
  let updated = 0

  for (const row of rows) {
    const conceptType = conceptTypeByName.get(normalizeConceptLookupValue(row.conceptTypeName))
    if (!conceptType) {
      failures.push(buildFailure(row, `Unknown conceptTypeName: ${row.conceptTypeName}`))
      failedRowNumbers.add(row.rowNumber)
      continue
    }

    if (row.conceptId) {
      if (existingById.has(row.conceptId)) {
        continue
      }

      if (seenCreateKeys.has(`id::${row.conceptId}`)) {
        continue
      }

      createPayload.push({
        id: row.conceptId,
        name: row.name.trim(),
        description: row.description,
        concept_type_id: conceptType.id,
      })
      seenCreateKeys.add(`id::${row.conceptId}`)
      continue
    }

    const candidates = getScopedCandidates(existingByTypeAndName, conceptType.id, row.name, row.rootConceptId)
    if (candidates.length > 1) {
      failures.push(
        buildFailure(
          row,
          'Ambiguous concept target for conceptTypeName+name in current scope. Provide conceptId or rootConceptId.',
        ),
      )
      failedRowNumbers.add(row.rowNumber)
      continue
    }

    if (candidates.length === 0) {
      const createKey = `${conceptType.id}::${normalizeConceptLookupValue(row.name)}::${row.rootConceptId ?? ''}`
      if (seenCreateKeys.has(createKey)) {
        continue
      }

      createPayload.push({
        name: row.name.trim(),
        description: row.description,
        concept_type_id: conceptType.id,
      })
      seenCreateKeys.add(createKey)
    }
  }

  if (createPayload.length > 0) {
    const { error: insertError } = await supabase.from('concept').insert(createPayload)
    if (insertError) {
      const importError = fromDbError(insertError)
      return {
        fatalError: importError,
        summary: {
          total: rows.length,
          created: 0,
          updated: 0,
          failed: rows.length,
          failures: rows.map((row) => buildFailure(row, importError)),
        },
      }
    }
  }

  const { data: allConcepts, error: queryError } = await supabase
    .from('concept')
    .select('id,name,description,concept_type_id,root_concept_id,part_of_concept_id,part_order,reference_to_concept_id,created_at,updated_at')

  if (queryError) {
    const importError = fromDbError(queryError)
    return {
      fatalError: importError,
      summary: {
        total: rows.length,
        created: createPayload.length,
        updated: 0,
        failed: rows.length,
        failures: rows.map((row) => buildFailure(row, importError)),
      },
    }
  }

  const allValues = allConcepts ?? []
  const allById = new Map(allValues.map((concept) => [concept.id, concept]))
  const allByTypeAndName = indexByTypeAndName(allValues)

  for (const row of rows) {
    if (failedRowNumbers.has(row.rowNumber)) {
      continue
    }

    const conceptType = conceptTypeByName.get(normalizeConceptLookupValue(row.conceptTypeName))
    if (!conceptType) {
      continue
    }

    let target: ConceptRecord | null = null
    if (row.conceptId) {
      target = allById.get(row.conceptId) ?? null
      if (!target) {
        failures.push(buildFailure(row, `Concept id '${row.conceptId}' was not found after create pass.`))
        continue
      }

      if (target.concept_type_id !== conceptType.id) {
        failures.push(buildFailure(row, `Concept id '${row.conceptId}' is not in ConceptType '${row.conceptTypeName}'.`))
        continue
      }
    } else {
      const targetCandidates = getScopedCandidates(allByTypeAndName, conceptType.id, row.name, row.rootConceptId)
      if (targetCandidates.length > 1) {
        failures.push(
          buildFailure(
            row,
            'Ambiguous concept target for conceptTypeName+name in current scope. Provide conceptId or rootConceptId.',
          ),
        )
        continue
      }

      target = targetCandidates[0] ?? null
    }

    if (!target) {
      failures.push(buildFailure(row, 'Concept not found after create pass.'))
      continue
    }

    const scopedRootId = row.rootConceptId ?? target.root_concept_id

    let partOfConceptId: string | null = null
    if (row.partOfConceptId) {
      const parentById = allById.get(row.partOfConceptId) ?? null
      if (!parentById) {
        failures.push(buildFailure(row, `PartOf concept id '${row.partOfConceptId}' not found.`))
        continue
      }

      const expectedParentTypeId = conceptType.part_of_concept_type_id
      if (!expectedParentTypeId) {
        failures.push(buildFailure(row, `ConceptType ${conceptType.name} does not allow PartOf relationships.`))
        continue
      }

      if (parentById.concept_type_id !== expectedParentTypeId) {
        failures.push(buildFailure(row, `PartOf concept id '${row.partOfConceptId}' is not in the required parent ConceptType.`))
        continue
      }

      partOfConceptId = parentById.id
    } else if (row.partOfName) {
      const expectedParentTypeId = conceptType.part_of_concept_type_id
      if (!expectedParentTypeId) {
        failures.push(buildFailure(row, `ConceptType ${conceptType.name} does not allow PartOf relationships.`))
        continue
      }

      const parentCandidates = getScopedCandidates(allByTypeAndName, expectedParentTypeId, row.partOfName, scopedRootId)
      if (parentCandidates.length > 1) {
        failures.push(
          buildFailure(
            row,
            `PartOf target '${row.partOfName}' is ambiguous in the selected scope. Provide partOfConceptId.`,
          ),
        )
        continue
      }

      const parent = parentCandidates[0] ?? null
      if (!parent) {
        failures.push(buildFailure(row, `PartOf target '${row.partOfName}' not found in required parent ConceptType.`))
        continue
      }

      partOfConceptId = parent.id
    }

    let referenceToConceptId: string | null = null
    if (row.referenceToConceptId) {
      const referenceById = allById.get(row.referenceToConceptId) ?? null
      if (!referenceById) {
        failures.push(buildFailure(row, `ReferenceTo concept id '${row.referenceToConceptId}' not found.`))
        continue
      }

      const expectedReferenceTypeId = conceptType.reference_to_concept_type_id
      if (!expectedReferenceTypeId) {
        failures.push(buildFailure(row, `ConceptType ${conceptType.name} does not allow ReferenceTo relationships.`))
        continue
      }

      if (referenceById.concept_type_id !== expectedReferenceTypeId) {
        failures.push(
          buildFailure(
            row,
            `ReferenceTo concept id '${row.referenceToConceptId}' is not in the required reference ConceptType.`,
          ),
        )
        continue
      }

      referenceToConceptId = referenceById.id
    } else if (row.referenceToName) {
      const expectedReferenceTypeId = conceptType.reference_to_concept_type_id
      if (!expectedReferenceTypeId) {
        failures.push(buildFailure(row, `ConceptType ${conceptType.name} does not allow ReferenceTo relationships.`))
        continue
      }

      const referenceCandidates = getScopedCandidates(
        allByTypeAndName,
        expectedReferenceTypeId,
        row.referenceToName,
        scopedRootId,
      )
      if (referenceCandidates.length > 1) {
        failures.push(
          buildFailure(
            row,
            `ReferenceTo target '${row.referenceToName}' is ambiguous in the selected scope. Provide referenceToConceptId.`,
          ),
        )
        continue
      }

      const reference = referenceCandidates[0] ?? null
      if (!reference) {
        failures.push(
          buildFailure(row, `ReferenceTo target '${row.referenceToName}' not found in required reference ConceptType.`),
        )
        continue
      }

      referenceToConceptId = reference.id
    }

    const normalizedPartOrder = partOfConceptId ? row.partOrder : null
    if (!partOfConceptId && row.partOrder !== null) {
      failures.push(buildFailure(row, 'partOrder requires partOfName or partOfConceptId.'))
      continue
    }

    const payload: ConceptPayload = {
      name: row.name.trim(),
      description: row.description,
      concept_type_id: conceptType.id,
      part_of_concept_id: partOfConceptId,
      part_order: normalizedPartOrder,
      reference_to_concept_id: referenceToConceptId,
    }

    const updateError = await updateConcept(target.id, payload)
    if (updateError) {
      failures.push(buildFailure(row, updateError))
      continue
    }

    updated += 1
  }

  return {
    fatalError: null,
    summary: {
      total: rows.length,
      created: createPayload.length,
      updated,
      failed: failures.length,
      failures,
    },
  }
}
