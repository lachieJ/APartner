import { supabase } from '../../../supabaseClient'
import type { ConceptTypeRecord } from '../../conceptTypes/csv/types'
import type { ConceptImportFailure, ConceptImportRow, ConceptImportSummary } from '../csv/types'
import type { ConceptPayload, ConceptRecord } from '../types'

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
    .select('id,name,description,concept_type_id,part_of_concept_id,part_order,reference_to_concept_id,created_at,updated_at')
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
  const conceptTypeByName = new Map(conceptTypes.map((conceptType) => [conceptType.name.trim().toLowerCase(), conceptType]))
  const conceptsByTypeAndName = new Map(
    existingConcepts.map((concept) => [`${concept.concept_type_id}::${concept.name.trim().toLowerCase()}`, concept]),
  )

  const failures: ConceptImportFailure[] = []
  const createPayload: Array<{ name: string; description: string | null; concept_type_id: string }> = []
  const seenCreateKeys = new Set<string>()
  let updated = 0

  for (const row of rows) {
    const conceptType = conceptTypeByName.get(row.conceptTypeName.trim().toLowerCase())
    if (!conceptType) {
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        conceptTypeName: row.conceptTypeName,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: `Unknown conceptTypeName: ${row.conceptTypeName}`,
      })
      continue
    }

    const key = `${conceptType.id}::${row.name.trim().toLowerCase()}`
    if (!conceptsByTypeAndName.has(key) && !seenCreateKeys.has(key)) {
      createPayload.push({
        name: row.name.trim(),
        description: row.description,
        concept_type_id: conceptType.id,
      })
      seenCreateKeys.add(key)
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
          failures: rows.map((row) => ({
            rowNumber: row.rowNumber,
            name: row.name,
            conceptTypeName: row.conceptTypeName,
            partOfName: row.partOfName,
            partOrder: row.partOrder,
            referenceToName: row.referenceToName,
            error: importError,
          })),
        },
      }
    }
  }

  const { data: allConcepts, error: queryError } = await supabase
    .from('concept')
    .select('id,name,description,concept_type_id,part_of_concept_id,part_order,reference_to_concept_id,created_at,updated_at')

  if (queryError) {
    const importError = fromDbError(queryError)
    return {
      fatalError: importError,
      summary: {
        total: rows.length,
        created: createPayload.length,
        updated: 0,
        failed: rows.length,
        failures: rows.map((row) => ({
          rowNumber: row.rowNumber,
          name: row.name,
          conceptTypeName: row.conceptTypeName,
          partOfName: row.partOfName,
          partOrder: row.partOrder,
          referenceToName: row.referenceToName,
          error: importError,
        })),
      },
    }
  }

  const allByTypeAndName = new Map(
    (allConcepts ?? []).map((concept) => [`${concept.concept_type_id}::${concept.name.trim().toLowerCase()}`, concept]),
  )

  for (const row of rows) {
    const conceptType = conceptTypeByName.get(row.conceptTypeName.trim().toLowerCase())
    if (!conceptType) {
      continue
    }

    const key = `${conceptType.id}::${row.name.trim().toLowerCase()}`
    const target = allByTypeAndName.get(key)
    if (!target) {
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        conceptTypeName: row.conceptTypeName,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: 'Concept not found after create pass.',
      })
      continue
    }

    let partOfConceptId: string | null = null
    if (row.partOfName) {
      const expectedParentTypeId = conceptType.part_of_concept_type_id
      if (!expectedParentTypeId) {
        failures.push({
          rowNumber: row.rowNumber,
          name: row.name,
          conceptTypeName: row.conceptTypeName,
          partOfName: row.partOfName,
          partOrder: row.partOrder,
          referenceToName: row.referenceToName,
          error: `ConceptType ${conceptType.name} does not allow PartOf relationships.`,
        })
        continue
      }

      const parent = allByTypeAndName.get(`${expectedParentTypeId}::${row.partOfName.trim().toLowerCase()}`)
      if (!parent) {
        failures.push({
          rowNumber: row.rowNumber,
          name: row.name,
          conceptTypeName: row.conceptTypeName,
          partOfName: row.partOfName,
          partOrder: row.partOrder,
          referenceToName: row.referenceToName,
          error: `PartOf target '${row.partOfName}' not found in required parent ConceptType.`,
        })
        continue
      }

      partOfConceptId = parent.id
    }

    let referenceToConceptId: string | null = null
    if (row.referenceToName) {
      const expectedReferenceTypeId = conceptType.reference_to_concept_type_id
      if (!expectedReferenceTypeId) {
        failures.push({
          rowNumber: row.rowNumber,
          name: row.name,
          conceptTypeName: row.conceptTypeName,
          partOfName: row.partOfName,
          partOrder: row.partOrder,
          referenceToName: row.referenceToName,
          error: `ConceptType ${conceptType.name} does not allow ReferenceTo relationships.`,
        })
        continue
      }

      const reference = allByTypeAndName.get(`${expectedReferenceTypeId}::${row.referenceToName.trim().toLowerCase()}`)
      if (!reference) {
        failures.push({
          rowNumber: row.rowNumber,
          name: row.name,
          conceptTypeName: row.conceptTypeName,
          partOfName: row.partOfName,
          partOrder: row.partOrder,
          referenceToName: row.referenceToName,
          error: `ReferenceTo target '${row.referenceToName}' not found in required reference ConceptType.`,
        })
        continue
      }

      referenceToConceptId = reference.id
    }

    const normalizedPartOrder = row.partOfName ? row.partOrder : null
    if (!row.partOfName && row.partOrder !== null) {
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        conceptTypeName: row.conceptTypeName,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: 'partOrder requires partOfName.',
      })
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
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        conceptTypeName: row.conceptTypeName,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: updateError,
      })
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
