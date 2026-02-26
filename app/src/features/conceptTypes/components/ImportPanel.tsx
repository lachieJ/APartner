import type { ImportPreviewSummary, ImportSummary } from '../csv/types'

type ImportPanelProps = {
  importCsvText: string
  setImportCsvText: (value: string) => void
  importFileName: string | null
  importFileError: string | null
  importing: boolean
  loading: boolean
  hasConceptTypes: boolean
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
  return (
    <>
      <p className="hint">
        Import CSV columns: name, description, partOfName, partOrder, referenceToName (max file size: 2 MB)
      </p>
      <input type="file" accept=".csv,text/csv" onChange={onImportFileSelected} />
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
            {' | '}To update {importPreviewSummary.toUpdate} | Unchanged {importPreviewSummary.unchanged}
          </p>
        </div>
      ) : null}
      {importSummary ? (
        <div className="importSummary">
          <p>
            <strong>Import summary:</strong> Total {importSummary.total} | Created {importSummary.created} |
            Updated {importSummary.updated} | Failed {importSummary.failed}
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
