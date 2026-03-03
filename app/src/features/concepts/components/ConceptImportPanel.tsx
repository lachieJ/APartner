import type { ConceptImportSummary } from '../csv/types'

type ConceptImportPanelProps = {
  importCsvText: string
  setImportCsvText: (value: string) => void
  importFileName: string | null
  importFileError: string | null
  importing: boolean
  hasConcepts: boolean
  onImportFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void
  onImport: () => void
  onDownloadSampleCsv: () => void
  onExportCsv: () => void
  onClear: () => void
  onDownloadImportErrorsCsv: () => void
  clearFileStatus: () => void
  importSummary: ConceptImportSummary | null
}

export function ConceptImportPanel({
  importCsvText,
  setImportCsvText,
  importFileName,
  importFileError,
  importing,
  hasConcepts,
  onImportFileSelected,
  onImport,
  onDownloadSampleCsv,
  onExportCsv,
  onClear,
  onDownloadImportErrorsCsv,
  clearFileStatus,
  importSummary,
}: ConceptImportPanelProps) {
  return (
    <>
      <h3>Concept Model Import & Export</h3>
      <p className="hint">
        CSV format: conceptId, name, description, conceptTypeName, rootConceptId, partOfConceptId, partOfName, partOrder,
        referenceToConceptId, referenceToName (max file size: 2 MB)
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
          'conceptId,name,description,conceptTypeName,rootConceptId,partOfConceptId,partOfName,partOrder,referenceToConceptId,referenceToName',
          ',Treasury,National treasury department,Enterprise,,,,,,',
          ',Tax Administration,Core revenue stream,Value Stream,,,Treasury,1,,',
        ].join('\n')}
      />

      <div className="actions">
        <button type="button" onClick={onImport} disabled={importing || !importCsvText.trim()}>
          {importing ? 'Importing...' : 'Import CSV'}
        </button>
        <button type="button" onClick={onDownloadSampleCsv} disabled={importing}>
          Download sample CSV
        </button>
        <button type="button" onClick={onExportCsv} disabled={!hasConcepts}>
          Export CSV
        </button>
        <button type="button" onClick={onClear} disabled={importing}>
          Clear
        </button>
      </div>

      {importSummary ? (
        <div className="importSummary">
          <p>
            <strong>Import summary:</strong> Total {importSummary.total} | Created {importSummary.created} | Updated{' '}
            {importSummary.updated} | Failed {importSummary.failed}
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
