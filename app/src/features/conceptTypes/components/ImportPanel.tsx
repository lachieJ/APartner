import type { ImportPreviewSummary, ImportSummary } from '../csv/types'

type ImportPanelProps = {
  importCsvText: string
  setImportCsvText: (value: string) => void
  importFileName: string | null
  importFileError: string | null
  importing: boolean
  loading: boolean
  hasConceptTypes: boolean
  importMode: 'upsert-only' | 'full-sync'
  setImportMode: (value: 'upsert-only' | 'full-sync') => void
  allowDeletes: boolean
  setAllowDeletes: (value: boolean) => void
  confirmHighImpact: boolean
  setConfirmHighImpact: (value: boolean) => void
  importPreviewSummary: ImportPreviewSummary | null
  importSummary: ImportSummary | null
  onImportFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void
  onPreview: () => void
  onImport: () => void
  onDownloadSampleCsv: () => void
  onExportCsv: () => void
  onClear: () => void
  onDownloadImportErrorsCsv: () => void
  clearFileStatus: () => void
}

export function ImportPanel({
  importCsvText,
  setImportCsvText,
  importFileName,
  importFileError,
  importing,
  loading,
  hasConceptTypes,
  importMode,
  setImportMode,
  allowDeletes,
  setAllowDeletes,
  confirmHighImpact,
  setConfirmHighImpact,
  importPreviewSummary,
  importSummary,
  onImportFileSelected,
  onPreview,
  onImport,
  onDownloadSampleCsv,
  onExportCsv,
  onClear,
  onDownloadImportErrorsCsv,
  clearFileStatus,
}: ImportPanelProps) {
  const hasHighImpactWarning = Boolean(
    importPreviewSummary?.warnings.some((warning) => warning.toLowerCase().includes('high-impact')),
  )

  const safetyState: 'safe' | 'caution' | 'destructive' =
    importMode === 'upsert-only'
      ? 'safe'
      : !allowDeletes
        ? 'caution'
        : hasHighImpactWarning || (importPreviewSummary?.toDelete ?? 0) > 0
          ? 'destructive'
          : 'caution'

  const safetyLabel =
    safetyState === 'safe' ? 'SAFE' : safetyState === 'caution' ? 'CAUTION' : 'DESTRUCTIVE'

  const safetyMessage =
    safetyState === 'safe'
      ? 'Upsert-only mode active. Missing rows are previewed but never deleted.'
      : safetyState === 'caution'
        ? 'Full-sync mode selected, but deletes are not currently armed.'
        : `Deletes are armed in full-sync mode.${
            (importPreviewSummary?.toDelete ?? 0) > 0
              ? ` ${importPreviewSummary?.toDelete ?? 0} delete candidate(s) detected.`
              : ''
          }`

  return (
    <>
      <h3>MetaModel Type Import & Export</h3>
      <p className="hint">
        CSV format for import/export: name, description, partOfName, partOrder, referenceToName (max file size: 2 MB)
      </p>
      <div className={`importSafety importSafety-${safetyState}`}>
        <strong>Import Safety: {safetyLabel}</strong>
        <p>{safetyMessage}</p>
      </div>
      <input type="file" accept=".csv,text/csv" onChange={onImportFileSelected} />
      <div className="viewControls">
        <label>
          Import mode
          <select
            value={importMode}
            onChange={(event) => {
              const nextMode = event.target.value as 'upsert-only' | 'full-sync'
              setImportMode(nextMode)
              if (nextMode === 'upsert-only') {
                setAllowDeletes(false)
                setConfirmHighImpact(false)
              }
            }}
          >
            <option value="upsert-only">Upsert only (no deletes)</option>
            <option value="full-sync">Full sync (missing rows can be deleted)</option>
          </select>
        </label>
      </div>
      {importMode === 'full-sync' ? (
        <details className="viewControls">
          <summary>Advanced delete controls</summary>
          <label className="inlineToggle">
            <input
              type="checkbox"
              checked={allowDeletes}
              onChange={(event) => setAllowDeletes(event.target.checked)}
            />
            Allow deletes for rows missing from CSV
          </label>
          <label className="inlineToggle">
            <input
              type="checkbox"
              checked={confirmHighImpact}
              onChange={(event) => setConfirmHighImpact(event.target.checked)}
            />
            Confirm high-impact delete when prompted
          </label>
        </details>
      ) : null}
      {importMode === 'upsert-only' ? (
        <p className="hint">Delete behavior: dry-run only. Missing rows are previewed but will not be deleted.</p>
      ) : null}
      {importMode === 'full-sync' && !allowDeletes ? (
        <p className="hint">Delete behavior: disabled. Enable "Allow deletes" to apply missing-row deletes.</p>
      ) : null}
      {importMode === 'full-sync' && allowDeletes ? (
        <p className="hint">
          Delete behavior: enabled. Missing rows may be deleted on import (high-impact imports require explicit
          confirmation).
        </p>
      ) : null}
      <p className="fileStatus">{importFileName ? `Selected file: ${importFileName}` : 'No file selected'}</p>
      {importFileError ? <p className="fileError">{importFileError}</p> : null}
      <textarea
        className="importArea"
        value={importCsvText}
        onChange={(event) => {
          setImportCsvText(event.target.value)
          clearFileStatus()
        }}
        placeholder={[
          'name,description,partOfName,partOrder,referenceToName',
          'Enterprise,Top-level concept,,,',
          'Capability,Business ability,Enterprise,1,',
        ].join('\n')}
      />
      <p className="hint">Import CSV is enabled when CSV content is present.</p>
      <div className="actions">
        <button type="button" onClick={onPreview} disabled={importing || !importCsvText.trim()}>
          Preview CSV
        </button>
        <button type="button" onClick={onImport} disabled={importing || !importCsvText.trim()}>
          {importing ? 'Importing...' : 'Import CSV'}
        </button>
        <button type="button" onClick={onDownloadSampleCsv} disabled={importing}>
          Download sample CSV
        </button>
        <button type="button" onClick={onExportCsv} disabled={loading || !hasConceptTypes}>
          Export CSV
        </button>
        <button type="button" onClick={onClear} disabled={importing}>
          Clear
        </button>
      </div>
      {importPreviewSummary ? (
        <div className="importSummary">
          <p>
            <strong>Preview:</strong> Total {importPreviewSummary.total} | To create {importPreviewSummary.toCreate}
            {' | '}To update {importPreviewSummary.toUpdate} | To delete {importPreviewSummary.toDelete} | Unchanged{' '}
            {importPreviewSummary.unchanged}
          </p>
          {importPreviewSummary.warnings.length > 0 ? (
            <ul>
              {importPreviewSummary.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {importPreviewSummary.deleteCandidates.length > 0 ? (
            <p className="hint">
              Delete candidates (first 10): {importPreviewSummary.deleteCandidates.slice(0, 10).join(', ')}
              {importPreviewSummary.deleteCandidates.length > 10 ? '…' : ''}
            </p>
          ) : null}
        </div>
      ) : null}
      {importSummary ? (
        <div className="importSummary">
          <p>
            <strong>Import summary:</strong> Total {importSummary.total} | Created {importSummary.created} |
            Updated {importSummary.updated} | Deleted {importSummary.deleted} | Failed {importSummary.failed}
          </p>
          {importSummary.failures.length > 0 ? (
            <>
              <ul>
                {importSummary.failures.slice(0, 10).map((failure) => (
                  <li key={`${failure.rowNumber}-${failure.name}-${failure.error}`}>
                    Row {failure.rowNumber} ({failure.name}): {failure.error}
                  </li>
                ))}
              </ul>
              <div className="actions">
                <button type="button" onClick={onDownloadImportErrorsCsv}>
                  Download import errors CSV
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
