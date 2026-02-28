export type VersionSource = 'import' | 'rollback' | 'manual'
export type ImportMode = 'upsert-only' | 'full-sync'

export type ChangeCounts = {
  created: number
  updated: number
  deleted: number
  unchanged: number
  total: number
}

export type ChangeSummary = {
  counts: ChangeCounts
  byConceptType?: Record<string, { created: number; updated: number; deleted: number }>
  highImpact?: { deletePercent?: number; maxDepthChanged?: number }
  deleteCandidates?: string[]
  warnings?: string[]
}

export type ModelVersion = {
  id: string
  workspaceId: string
  versionNo: number
  parentVersionId: string | null
  source: VersionSource
  filename: string
  reason: string
  changeSummary: ChangeSummary | null
  fileHash: string | null
  createdBy: string
  createdAt: string
}

export type ImportPreviewRequest = {
  workspaceId: string
  filename: string
  reason: string
  csv: string
  importMode?: ImportMode
}

export type ImportPreviewResponse = {
  previewToken: string
  currentVersionId: string | null
  counts: ChangeCounts
  changeSummary?: ChangeSummary
  warnings: string[]
  errors: string[]
}

export type ImportCommitRequest = {
  workspaceId: string
  previewToken: string
  filename: string
  reason: string
  confirmHighImpact: boolean
  importMode?: ImportMode
  allowDeletes?: boolean
  changeSummary?: ChangeSummary
}

export type VersionMutationResult = {
  versionId: string
  versionNo: number
  parentVersionId: string | null
  source: VersionSource
}

export type RollbackRequest = {
  workspaceId: string
  targetVersionId: string
  filename: string
  reason: string
  changeSummary?: ChangeSummary
}
