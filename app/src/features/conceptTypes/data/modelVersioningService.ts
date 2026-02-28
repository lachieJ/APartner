import { supabase } from '../../../supabaseClient'
import { parseImportCsv } from '../csv/csvUtils'
import { friendlyConceptTypeError, listConceptTypes } from './conceptTypeService'
import type {
  ChangeSummary,
  ImportMode,
  ImportCommitRequest,
  ImportPreviewRequest,
  ImportPreviewResponse,
  ModelVersion,
  RollbackRequest,
  VersionMutationResult,
} from '../types/modelVersioning'

type DbErrorShape = {
  message: string
  code?: string
  details?: string
  hint?: string
}

type ModelVersionRow = {
  id: string
  workspace_id: string
  version_no: number
  parent_version_id: string | null
  source: 'import' | 'rollback' | 'manual'
  filename: string
  reason: string
  change_summary: ModelVersion['changeSummary']
  file_hash: string | null
  created_by: string
  created_at: string
}

type ModelHeadRow = {
  current_version_id: string
}

type CommitSnapshotRpcRow = {
  version_id: string
  version_no: number
  parent_version_id: string | null
  source: string
}

type RollbackRpcRow = {
  version_id: string
  version_no: number
  parent_version_id: string | null
  source: string
  restored_count: number
}

const MODEL_VERSIONING_FLAG_KEY = 'model_versioning_v1'
const DELETE_CONFIRMATION_THRESHOLD_PERCENT = 20

const EMPTY_COUNTS = {
  created: 0,
  updated: 0,
  deleted: 0,
  unchanged: 0,
  total: 0,
}

const fromDbError = (error: DbErrorShape) =>
  friendlyConceptTypeError(error.message, error.code, error.details, error.hint)

const toModelVersion = (row: ModelVersionRow): ModelVersion => ({
  id: row.id,
  workspaceId: row.workspace_id,
  versionNo: row.version_no,
  parentVersionId: row.parent_version_id,
  source: row.source,
  filename: row.filename,
  reason: row.reason,
  changeSummary: row.change_summary,
  fileHash: row.file_hash,
  createdBy: row.created_by,
  createdAt: row.created_at,
})

const normalize = (value: string | null | undefined) => (value ?? '').trim()

const safeDeletePercent = (deleted: number, totalCurrent: number) => {
  if (totalCurrent <= 0) return 0
  return Number(((deleted / totalCurrent) * 100).toFixed(2))
}

const resolveImportMode = (importMode?: ImportMode): ImportMode => importMode ?? 'upsert-only'

export const isModelVersioningEnabled = async (): Promise<{ enabled: boolean; error: string | null }> => {
  const { data, error } = await supabase.rpc('is_feature_enabled', { p_key: MODEL_VERSIONING_FLAG_KEY })

  if (error) {
    return {
      enabled: false,
      error: `Could not read model versioning feature flag. ${fromDbError(error)}`,
    }
  }

  return { enabled: Boolean(data), error: null }
}

export const listModelVersions = async (
  workspaceId: string,
): Promise<{ data: ModelVersion[]; error: string | null }> => {
  const { enabled, error: featureError } = await isModelVersioningEnabled()
  if (featureError) return { data: [], error: featureError }
  if (!enabled) return { data: [], error: 'Model versioning is disabled.' }

  const { data, error } = await supabase
    .from('model_version')
    .select(
      'id,workspace_id,version_no,parent_version_id,source,filename,reason,change_summary,file_hash,created_by,created_at',
    )
    .eq('workspace_id', workspaceId)
    .order('version_no', { ascending: false })

  if (error) {
    return { data: [], error: fromDbError(error) }
  }

  return {
    data: (data as ModelVersionRow[] | null)?.map(toModelVersion) ?? [],
    error: null,
  }
}

export const previewModelImportVersion = async (
  request: ImportPreviewRequest,
): Promise<{ data: ImportPreviewResponse | null; error: string | null }> => {
  const { enabled, error: featureError } = await isModelVersioningEnabled()
  if (featureError) return { data: null, error: featureError }
  if (!enabled) return { data: null, error: 'Model versioning is disabled.' }

  const validationErrors: string[] = []
  if (!request.workspaceId.trim()) validationErrors.push('workspaceId is required.')
  if (!request.filename.trim()) validationErrors.push('filename is required.')
  if (!request.reason.trim()) validationErrors.push('reason is required.')
  if (!request.csv.trim()) validationErrors.push('csv content is required.')

  if (validationErrors.length > 0) {
    return {
      data: {
        previewToken: '',
        currentVersionId: null,
        counts: EMPTY_COUNTS,
        warnings: [],
        errors: validationErrors,
      },
      error: null,
    }
  }

  let rows
  try {
    rows = parseImportCsv(request.csv)
  } catch (parseError) {
    return {
      data: {
        previewToken: '',
        currentVersionId: null,
        counts: EMPTY_COUNTS,
        warnings: [],
        errors: [parseError instanceof Error ? parseError.message : String(parseError)],
      },
      error: null,
    }
  }

  const { data: currentConceptTypes, error: listError } = await listConceptTypes()
  if (listError) {
    return { data: null, error: listError }
  }

  const importMode = resolveImportMode(request.importMode)
  const existingByName = new Map(currentConceptTypes.map((item) => [item.name.trim().toLowerCase(), item]))
  const idToName = new Map(currentConceptTypes.map((item) => [item.id, item.name]))
  const importNameKeys = new Set(rows.map((row) => row.name.trim().toLowerCase()))

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const row of rows) {
    const existing = existingByName.get(row.name.trim().toLowerCase())
    if (!existing) {
      created += 1
      continue
    }

    const currentDescription = normalize(existing.description)
    const nextDescription = normalize(row.description)
    const currentPartOfName = existing.part_of_concept_type_id ? normalize(idToName.get(existing.part_of_concept_type_id)) : ''
    const nextPartOfName = normalize(row.partOfName)
    const currentReferenceToName = existing.reference_to_concept_type_id
      ? normalize(idToName.get(existing.reference_to_concept_type_id))
      : ''
    const nextReferenceToName = normalize(row.referenceToName)
    const currentPartOrder = existing.part_order ?? null
    const nextPartOrder = row.partOrder ?? null

    const changed =
      currentDescription !== nextDescription ||
      currentPartOfName !== nextPartOfName ||
      currentReferenceToName !== nextReferenceToName ||
      currentPartOrder !== nextPartOrder

    if (changed) {
      updated += 1
    } else {
      unchanged += 1
    }
  }

  const deleteCandidates = currentConceptTypes
    .filter((item) => !importNameKeys.has(item.name.trim().toLowerCase()))
    .map((item) => item.name)

  const inferredDeleted = deleteCandidates.length
  const deleted = importMode === 'full-sync' ? inferredDeleted : 0
  const warnings: string[] = []
  if (importMode === 'upsert-only' && inferredDeleted > 0) {
    warnings.push(`Upsert-only mode: ${inferredDeleted} missing row(s) will NOT be deleted.`)
  }
  if (importMode === 'full-sync' && deleted > 0) {
    warnings.push(`Full-sync mode: ${deleted} delete candidate(s) detected.`)
  }

  const deletePercent = safeDeletePercent(deleted, currentConceptTypes.length)
  if (importMode === 'full-sync' && deletePercent > DELETE_CONFIRMATION_THRESHOLD_PERCENT) {
    warnings.push(
      `High-impact delete threshold exceeded (${deletePercent}% > ${DELETE_CONFIRMATION_THRESHOLD_PERCENT}%). Explicit confirmation is required.`,
    )
  }

  const changeSummary: ChangeSummary = {
    counts: {
      created,
      updated,
      deleted,
      unchanged,
      total: rows.length,
    },
    highImpact: {
      deletePercent,
    },
    deleteCandidates,
    warnings,
  }

  const { data: headData, error: headError } = await supabase
    .from('model_head')
    .select('current_version_id')
    .eq('workspace_id', request.workspaceId)
    .maybeSingle()

  if (headError) {
    return { data: null, error: fromDbError(headError) }
  }

  return {
    data: {
      previewToken: crypto.randomUUID(),
      currentVersionId: (headData as ModelHeadRow | null)?.current_version_id ?? null,
      counts: changeSummary.counts,
      changeSummary,
      warnings,
      errors: [],
    },
    error: null,
  }
}

export const commitModelImportVersion = async (
  request: ImportCommitRequest,
): Promise<{ data: VersionMutationResult | null; error: string | null }> => {
  const { enabled, error: featureError } = await isModelVersioningEnabled()
  if (featureError) return { data: null, error: featureError }
  if (!enabled) return { data: null, error: 'Model versioning is disabled.' }

  if (!request.workspaceId.trim() || !request.previewToken.trim() || !request.filename.trim() || !request.reason.trim()) {
    return { data: null, error: 'workspaceId, previewToken, filename, and reason are required.' }
  }

  const importMode = resolveImportMode(request.importMode)
  const deleted = request.changeSummary?.counts.deleted ?? 0
  const deletePercent = request.changeSummary?.highImpact?.deletePercent ?? 0

  if (importMode === 'upsert-only' && deleted > 0) {
    return {
      data: null,
      error: 'Deletes are not allowed in upsert-only mode. Switch to full-sync mode and explicitly allow deletes.',
    }
  }

  if (importMode === 'full-sync' && deleted > 0 && !request.allowDeletes) {
    return {
      data: null,
      error: 'Full-sync delete candidates detected. Set allowDeletes=true to proceed.',
    }
  }

  if (
    importMode === 'full-sync' &&
    deleted > 0 &&
    deletePercent > DELETE_CONFIRMATION_THRESHOLD_PERCENT &&
    !request.confirmHighImpact
  ) {
    return {
      data: null,
      error: `High-impact delete threshold exceeded (${deletePercent}% > ${DELETE_CONFIRMATION_THRESHOLD_PERCENT}%). confirmHighImpact=true is required.`,
    }
  }

  const { data, error } = await supabase.rpc('model_versioning_commit_snapshot', {
    p_workspace_id: request.workspaceId,
    p_filename: request.filename,
    p_reason: request.reason,
    p_source: 'import',
    p_parent_version_id: null,
    p_change_summary: request.changeSummary ?? null,
    p_file_hash: null,
  })

  if (error) {
    return { data: null, error: fromDbError(error) }
  }

  const row = (data as CommitSnapshotRpcRow[] | null)?.[0]
  if (!row) {
    return { data: null, error: 'Version commit did not return a result row.' }
  }

  return {
    data: {
      versionId: row.version_id,
      versionNo: row.version_no,
      parentVersionId: row.parent_version_id,
      source: row.source as VersionMutationResult['source'],
    },
    error: null,
  }
}

export const rollbackModelVersion = async (
  request: RollbackRequest,
): Promise<{ data: VersionMutationResult | null; error: string | null }> => {
  const { enabled, error: featureError } = await isModelVersioningEnabled()
  if (featureError) return { data: null, error: featureError }
  if (!enabled) return { data: null, error: 'Model versioning is disabled.' }

  if (!request.workspaceId.trim() || !request.targetVersionId.trim() || !request.filename.trim() || !request.reason.trim()) {
    return { data: null, error: 'workspaceId, targetVersionId, filename, and reason are required.' }
  }

  const { data, error } = await supabase.rpc('model_versioning_rollback_to_version', {
    p_workspace_id: request.workspaceId,
    p_target_version_id: request.targetVersionId,
    p_filename: request.filename,
    p_reason: request.reason,
    p_change_summary: request.changeSummary ?? null,
  })

  if (error) {
    return { data: null, error: fromDbError(error) }
  }

  const row = (data as RollbackRpcRow[] | null)?.[0]
  if (!row) {
    return { data: null, error: 'Rollback did not return a result row.' }
  }

  return {
    data: {
      versionId: row.version_id,
      versionNo: row.version_no,
      parentVersionId: row.parent_version_id,
      source: row.source as VersionMutationResult['source'],
    },
    error: null,
  }
}

export const createModelVersionSnapshot = async (request: {
  workspaceId: string
  filename: string
  reason: string
  source?: 'import' | 'rollback' | 'manual'
  changeSummary?: ChangeSummary
}): Promise<{ data: VersionMutationResult | null; error: string | null }> => {
  const { enabled, error: featureError } = await isModelVersioningEnabled()
  if (featureError) return { data: null, error: featureError }
  if (!enabled) return { data: null, error: 'Model versioning is disabled.' }

  if (!request.workspaceId.trim() || !request.filename.trim() || !request.reason.trim()) {
    return { data: null, error: 'workspaceId, filename, and reason are required.' }
  }

  const { data, error } = await supabase.rpc('model_versioning_commit_snapshot', {
    p_workspace_id: request.workspaceId,
    p_filename: request.filename,
    p_reason: request.reason,
    p_source: request.source ?? 'manual',
    p_parent_version_id: null,
    p_change_summary: request.changeSummary ?? null,
    p_file_hash: null,
  })

  if (error) {
    return { data: null, error: fromDbError(error) }
  }

  const row = (data as CommitSnapshotRpcRow[] | null)?.[0]
  if (!row) {
    return { data: null, error: 'Snapshot creation did not return a result row.' }
  }

  return {
    data: {
      versionId: row.version_id,
      versionNo: row.version_no,
      parentVersionId: row.parent_version_id,
      source: row.source as VersionMutationResult['source'],
    },
    error: null,
  }
}
