import { supabase } from '../../../supabaseClient'
import type { ConceptTypeRecord, ImportFailure, ImportRow, ImportSummary } from '../csv/types'

type DbErrorShape = {
  message: string
  code?: string
  details?: string
  hint?: string
}

export type ConceptTypePayload = {
  name: string
  description: string | null
  part_of_concept_type_id: string | null
  part_order: number | null
  reference_to_concept_type_id: string | null
}

export const friendlyConceptTypeError = (raw: string, code?: string, details?: string, hint?: string) => {
  const merged = [raw, details ?? '', hint ?? ''].join(' | ')

  if (code === '57014' || merged.includes('statement timeout') || merged.includes('canceling statement due to statement timeout')) {
    return 'Save timed out while validating relationships. Apply migration 003_concept_type_cycle_trigger_timeout_fix.sql and retry.'
  }

  if (code === '23505' || merged.includes('uq_concept_type_name_ci')) {
    return 'Name must be unique (case-insensitive).'
  }

  if (code === '23503') {
    if (
      merged.includes('is still referenced') ||
      merged.includes('still referenced from table') ||
      merged.includes('concept_type_part_of_concept_type_id_fkey') ||
      merged.includes('concept_type_reference_to_concept_type_id_fkey')
    ) {
      return 'Cannot delete this MetaModel type because other MetaModel types still reference it via PartOf or ReferenceTo. Remove those links first.'
    }
    if (merged.includes('part_of_concept_type_id')) {
      return 'PartOfConceptTypeId does not exist.'
    }
    if (merged.includes('reference_to_concept_type_id')) {
      return 'ReferenceToConceptTypeId does not exist.'
    }
    return 'A referenced metamodel type does not exist.'
  }

  if (code === '23514') {
    if (merged.includes('chk_reference_requires_partof')) {
      return 'ReferenceToConceptTypeId requires PartOfConceptTypeId.'
    }
    if (merged.includes('chk_not_self_reference')) {
      return 'ReferenceToConceptTypeId cannot reference itself.'
    }
    if (merged.includes('chk_part_order_positive')) {
      return 'Order within parent must be a whole number greater than 0.'
    }
    if (merged.includes('chk_part_order_requires_partof')) {
      return 'Order within parent requires PartOfConceptTypeId.'
    }
  }

  if (raw.includes('PartOfConceptTypeId cycle detected')) return 'Invalid PartOf cycle detected.'
  if (raw.includes('ReferenceToConceptTypeId cycle detected')) return 'Invalid Reference cycle detected.'
  if (raw.includes('chk_reference_requires_partof')) {
    return 'ReferenceToConceptTypeId requires PartOfConceptTypeId.'
  }
  if (raw.includes('chk_not_self_reference')) return 'ReferenceToConceptTypeId cannot reference itself.'
  if (raw.includes('chk_part_order_positive')) return 'Order within parent must be a whole number greater than 0.'
  if (raw.includes('chk_part_order_requires_partof')) return 'Order within parent requires PartOfConceptTypeId.'
  if (code === 'P0001') {
    return raw
  }

  if (code && code.startsWith('23')) {
    return `Save failed due to a data integrity rule (${code}). ${raw}`
  }

  return raw || 'Save failed due to an unexpected database error.'
}

const fromDbError = (error: DbErrorShape) =>
  friendlyConceptTypeError(error.message, error.code, error.details, error.hint)

export const listConceptTypes = async (): Promise<{ data: ConceptTypeRecord[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('concept_type')
    .select('id,name,description,part_of_concept_type_id,part_order,reference_to_concept_type_id,created_at,updated_at')
    .order('name', { ascending: true })

  if (error) {
    return { data: [], error: fromDbError(error) }
  }

  return { data: data ?? [], error: null }
}

export const createConceptType = async (payload: ConceptTypePayload): Promise<string | null> => {
  const { error } = await supabase.from('concept_type').insert(payload)
  return error ? fromDbError(error) : null
}

export const updateConceptType = async (id: string, payload: ConceptTypePayload): Promise<string | null> => {
  const { error } = await supabase.from('concept_type').update(payload).eq('id', id)
  return error ? fromDbError(error) : null
}

export const updateConceptTypePartOrder = async (id: string, partOrder: number | null): Promise<string | null> => {
  const { error } = await supabase.from('concept_type').update({ part_order: partOrder }).eq('id', id)
  return error ? fromDbError(error) : null
}

export const deleteConceptType = async (id: string): Promise<string | null> => {
  const { data: blockers, error: blockersError } = await supabase
    .from('concept_type')
    .select('id,name,part_of_concept_type_id,reference_to_concept_type_id')
    .or(`part_of_concept_type_id.eq.${id},reference_to_concept_type_id.eq.${id}`)
    .order('name', { ascending: true })

  if (blockersError) {
    return fromDbError(blockersError)
  }

  if (blockers && blockers.length > 0) {
    const usedAsPartOfBy = blockers
      .filter((item) => item.part_of_concept_type_id === id)
      .map((item) => item.name)
    const usedAsReferenceToBy = blockers
      .filter((item) => item.reference_to_concept_type_id === id)
      .map((item) => item.name)

    const formatNames = (names: string[]) => {
      if (names.length === 0) return ''
      const shown = names.slice(0, 3).join(', ')
      const extra = names.length > 3 ? ` (+${names.length - 3} more)` : ''
      return `${shown}${extra}`
    }

    const segments: string[] = []
    if (usedAsPartOfBy.length > 0) {
      segments.push(`PartOf by: ${formatNames(usedAsPartOfBy)}`)
    }
    if (usedAsReferenceToBy.length > 0) {
      segments.push(`ReferenceTo by: ${formatNames(usedAsReferenceToBy)}`)
    }

    return `Cannot delete this ConceptType because it is still referenced. ${segments.join(' | ')}. Remove these links first.`
  }

  const { error } = await supabase.from('concept_type').delete().eq('id', id)
  return error ? fromDbError(error) : null
}

export const deleteConceptTypesBulk = async (ids: string[]): Promise<string | null> => {
  if (ids.length === 0) {
    return null
  }

  const { error } = await supabase.from('concept_type').delete().in('id', ids)
  return error ? fromDbError(error) : null
}

export const deleteAllConceptTypes = async (): Promise<string | null> => {
  const { error } = await supabase.from('concept_type').delete().not('id', 'is', null)
  return error ? fromDbError(error) : null
}

export const clearReferenceToLinksForTargets = async (targetIds: string[]): Promise<string | null> => {
  if (targetIds.length === 0) {
    return null
  }

  const { error } = await supabase
    .from('concept_type')
    .update({ reference_to_concept_type_id: null })
    .in('reference_to_concept_type_id', targetIds)

  return error ? fromDbError(error) : null
}

export const importConceptTypeRows = async (
  rows: ImportRow[],
  existingConceptTypes: ConceptTypeRecord[],
  options?: { importMode?: 'upsert-only' | 'full-sync'; allowDeletes?: boolean },
): Promise<{ summary: ImportSummary; fatalError: string | null }> => {
  const importMode = options?.importMode ?? 'upsert-only'
  const allowDeletes = options?.allowDeletes ?? false
  const existingByName = new Map(existingConceptTypes.map((item) => [item.name.trim().toLowerCase(), item]))
  const existingNamesBefore = new Set(existingByName.keys())
  const createMap = new Map<string, { name: string; description: string | null }>()
  const failures: ImportFailure[] = []
  let created = 0
  let updated = 0
  let deleted = 0
  let failed = 0

  for (const row of rows) {
    const key = row.name.toLowerCase()
    if (!existingByName.has(key) && !createMap.has(key)) {
      createMap.set(key, { name: row.name, description: row.description })
    }
  }

  if (createMap.size > 0) {
    const payload = Array.from(createMap.values())
    const { error: insertError } = await supabase.from('concept_type').insert(payload)
    if (insertError) {
      const importError = fromDbError(insertError)
      return {
        fatalError: importError,
        summary: {
          total: rows.length,
          created: 0,
          updated: 0,
          deleted: 0,
          failed: rows.length,
          failures: rows.map((row) => ({
            rowNumber: row.rowNumber,
            name: row.name,
            description: row.description,
            partOfName: row.partOfName,
            partOrder: row.partOrder,
            referenceToName: row.referenceToName,
            error: importError,
          })),
        },
      }
    }
    created = createMap.size
  }

  const { data: allConceptTypes, error: allConceptTypesError } = await supabase
    .from('concept_type')
    .select('id,name')

  if (allConceptTypesError) {
    const queryError = fromDbError(allConceptTypesError)
    return {
      fatalError: queryError,
      summary: {
        total: rows.length,
        created,
        updated: 0,
        deleted: 0,
        failed: rows.length,
        failures: rows.map((row) => ({
          rowNumber: row.rowNumber,
          name: row.name,
          description: row.description,
          partOfName: row.partOfName,
          partOrder: row.partOrder,
          referenceToName: row.referenceToName,
          error: queryError,
        })),
      },
    }
  }

  const nameToId = new Map(
    (allConceptTypes ?? []).map((item: { id: string; name: string }) => [item.name.trim().toLowerCase(), item.id]),
  )

  for (const row of rows) {
    const currentId = nameToId.get(row.name.toLowerCase())
    if (!currentId) {
      failed += 1
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        description: row.description,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: 'Could not resolve concept type by name after insert.',
      })
      continue
    }

    const partOfId = row.partOfName ? nameToId.get(row.partOfName.toLowerCase()) : null
    const referenceToId = row.referenceToName ? nameToId.get(row.referenceToName.toLowerCase()) : null

    if (row.partOfName && !partOfId) {
      failed += 1
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        description: row.description,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: `Unknown PartOf name '${row.partOfName}'.`,
      })
      continue
    }

    if (row.referenceToName && !referenceToId) {
      failed += 1
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        description: row.description,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: `Unknown ReferenceTo name '${row.referenceToName}'.`,
      })
      continue
    }

    if (referenceToId && !partOfId) {
      failed += 1
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        description: row.description,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: 'ReferenceTo requires PartOf.',
      })
      continue
    }

    if (row.partOrder !== null && !partOfId) {
      failed += 1
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        description: row.description,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: 'PartOrder requires PartOf.',
      })
      continue
    }

    const { error: updateError } = await supabase
      .from('concept_type')
      .update({
        description: row.description,
        part_of_concept_type_id: partOfId,
        part_order: partOfId ? row.partOrder ?? 1 : null,
        reference_to_concept_type_id: referenceToId,
      })
      .eq('id', currentId)

    if (updateError) {
      failed += 1
      failures.push({
        rowNumber: row.rowNumber,
        name: row.name,
        description: row.description,
        partOfName: row.partOfName,
        partOrder: row.partOrder,
        referenceToName: row.referenceToName,
        error: fromDbError(updateError),
      })
      continue
    }

    if (existingNamesBefore.has(row.name.toLowerCase())) {
      updated += 1
    }
  }

  if (importMode === 'full-sync' && allowDeletes) {
    const importNames = new Set(rows.map((row) => row.name.trim().toLowerCase()))
    const deleteIds = existingConceptTypes
      .filter((item) => !importNames.has(item.name.trim().toLowerCase()))
      .map((item) => item.id)

    if (deleteIds.length > 0) {
      const { error: deleteError } = await supabase.from('concept_type').delete().in('id', deleteIds)
      if (deleteError) {
        return {
          fatalError: fromDbError(deleteError),
          summary: {
            total: rows.length,
            created,
            updated,
            deleted,
            failed: failed + deleteIds.length,
            failures: [
              ...failures,
              ...deleteIds.map((id) => ({
                rowNumber: 0,
                name: id,
                description: null,
                partOfName: null,
                partOrder: null,
                referenceToName: null,
                error: fromDbError(deleteError),
              })),
            ],
          },
        }
      }
      deleted = deleteIds.length
    }
  }

  return {
    fatalError: null,
    summary: {
      total: rows.length,
      created,
      updated,
      deleted,
      failed,
      failures,
    },
  }
}
