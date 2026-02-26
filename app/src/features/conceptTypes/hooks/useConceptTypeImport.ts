import { useState } from 'react'
import {
  MAX_IMPORT_FILE_SIZE_BYTES,
  SAMPLE_CONCEPT_TYPES_CSV,
  buildConceptTypesCsv,
  buildImportErrorsCsv,
  parseImportCsv,
} from '../csv/csvUtils'
import type { ConceptTypeRecord, ImportPreviewSummary, ImportRow, ImportSummary } from '../csv/types'
import { importConceptTypeRows } from '../data/conceptTypeService'

type UseConceptTypeImportParams = {
  conceptTypes: ConceptTypeRecord[]
  reloadConceptTypes: () => Promise<void>
  setMessage: (value: string | null) => void
  setError: (value: string | null) => void
}

export function useConceptTypeImport({
  conceptTypes,
  reloadConceptTypes,
  setMessage,
  setError,
}: UseConceptTypeImportParams) {
  const [importCsvText, setImportCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [importPreviewSummary, setImportPreviewSummary] = useState<ImportPreviewSummary | null>(null)
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [importFileError, setImportFileError] = useState<string | null>(null)

  const clearImportFields = () => {
    setImportCsvText('')
    setImportPreviewSummary(null)
    setImportFileName(null)
    setImportFileError(null)
  }

  const clearFileStatus = () => {
    setImportFileName(null)
    setImportFileError(null)
  }

  const onImportFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFileError(null)
    setMessage(null)
    setError(null)

    const isCsvByType = file.type === 'text/csv' || file.type === 'application/vnd.ms-excel'
    const isCsvByName = file.name.toLowerCase().endsWith('.csv')

    if (!isCsvByType && !isCsvByName) {
      setImportFileName(null)
      setImportCsvText('')
      setImportSummary(null)
      setImportFileError('Only CSV files are supported. Please choose a .csv file.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2)
      const maxInMb = (MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)
      setImportFileName(file.name)
      setImportCsvText('')
      setImportSummary(null)
      setImportFileError(`File is too large (${sizeInMb} MB). Maximum supported size is ${maxInMb} MB.`)
      event.target.value = ''
      return
    }

    try {
      const text = await file.text()

      if (!text.trim()) {
        setImportFileName(file.name)
        setImportCsvText('')
        setImportSummary(null)
        setImportFileError('Selected file is empty.')
        event.target.value = ''
        return
      }

      try {
        parseImportCsv(text)
      } catch (parseError) {
        const parseMessage = parseError instanceof Error ? parseError.message : String(parseError)
        setImportFileName(file.name)
        setImportCsvText(text)
        setImportSummary(null)
        setImportFileError(`CSV validation error: ${parseMessage}`)
        event.target.value = ''
        return
      }

      setImportCsvText(text)
      setImportFileName(file.name)
      setImportSummary(null)
      setImportPreviewSummary(null)
      setMessage(`Loaded ${file.name}. Review and click Import CSV.`)
    } catch (readError) {
      const readMessage = readError instanceof Error ? readError.message : String(readError)
      setImportFileName(file.name)
      setImportCsvText('')
      setImportSummary(null)
      setImportFileError(`Could not read file: ${readMessage}`)
    } finally {
      event.target.value = ''
    }
  }

  const importConceptTypes = async () => {
    setMessage(null)
    setError(null)
    setImportSummary(null)
    setImportPreviewSummary(null)
    setImportFileError(null)

    if (!importCsvText.trim()) {
      setError('Paste CSV content or choose a CSV file first.')
      return
    }

    let rows: ImportRow[] = []
    try {
      rows = parseImportCsv(importCsvText)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError))
      return
    }

    setImporting(true)

    try {
      const { summary, fatalError } = await importConceptTypeRows(rows, conceptTypes)
      await reloadConceptTypes()

      setImportSummary(summary)
      if (fatalError) {
        setError(fatalError)
      } else if (summary.failed > 0) {
        setError(`Import completed with ${summary.failed} row error(s). See import summary.`)
      } else {
        setMessage(`Import completed. Created: ${summary.created}, Updated: ${summary.updated}, Failed: 0.`)
      }

      setImportCsvText('')
    } finally {
      setImporting(false)
    }
  }

  const previewImportConceptTypes = () => {
    setMessage(null)
    setError(null)
    setImportSummary(null)
    setImportFileError(null)

    if (!importCsvText.trim()) {
      setError('Paste CSV content or choose a CSV file first.')
      return
    }

    let rows: ImportRow[] = []
    try {
      rows = parseImportCsv(importCsvText)
    } catch (caughtError) {
      setImportPreviewSummary(null)
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError))
      return
    }

    const existingByName = new Map(conceptTypes.map((item) => [item.name.trim().toLowerCase(), item]))
    const idToName = new Map(conceptTypes.map((item) => [item.id, item.name]))

    let toCreate = 0
    let toUpdate = 0
    let unchanged = 0

    for (const row of rows) {
      const existing = existingByName.get(row.name.trim().toLowerCase())
      if (!existing) {
        toCreate += 1
        continue
      }

      const currentDescription = existing.description ?? ''
      const nextDescription = row.description ?? ''
      const currentPartOfName = existing.part_of_concept_type_id ? idToName.get(existing.part_of_concept_type_id) ?? '' : ''
      const nextPartOfName = row.partOfName ?? ''
      const currentReferenceToName = existing.reference_to_concept_type_id
        ? idToName.get(existing.reference_to_concept_type_id) ?? ''
        : ''
      const nextReferenceToName = row.referenceToName ?? ''
      const currentPartOrder = existing.part_order ?? null
      const nextPartOrder = row.partOrder ?? null

      const changed =
        currentDescription !== nextDescription ||
        currentPartOfName !== nextPartOfName ||
        currentReferenceToName !== nextReferenceToName ||
        currentPartOrder !== nextPartOrder

      if (changed) {
        toUpdate += 1
      } else {
        unchanged += 1
      }
    }

    const preview: ImportPreviewSummary = {
      total: rows.length,
      toCreate,
      toUpdate,
      unchanged,
    }

    setImportPreviewSummary(preview)
    setMessage(`Preview ready. Create: ${toCreate}, Update: ${toUpdate}, Unchanged: ${unchanged}.`)
  }

  const exportConceptTypes = () => {
    const csv = buildConceptTypesCsv(conceptTypes)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `concept-types-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setMessage(`Exported ${conceptTypes.length} concept type rows.`)
    setError(null)
  }

  const downloadSampleCsv = () => {
    const blob = new Blob([`${SAMPLE_CONCEPT_TYPES_CSV}\n`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'concept-types-sample.csv'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setMessage('Downloaded sample CSV template.')
    setError(null)
  }

  const downloadImportErrorsCsv = () => {
    if (!importSummary || importSummary.failures.length === 0) {
      return
    }

    const csv = buildImportErrorsCsv(importSummary.failures)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `concept-type-import-errors-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setMessage(`Downloaded ${importSummary.failures.length} import error rows.`)
  }

  return {
    importCsvText,
    setImportCsvText,
    importing,
    importSummary,
    importPreviewSummary,
    importFileName,
    importFileError,
    onImportFileSelected,
    previewImportConceptTypes,
    importConceptTypes,
    exportConceptTypes,
    downloadSampleCsv,
    downloadImportErrorsCsv,
    clearImportFields,
    clearFileStatus,
  }
}
