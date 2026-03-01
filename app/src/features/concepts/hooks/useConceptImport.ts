import { useState } from 'react'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import { importConceptRows } from '../data/conceptService'
import type { ConceptRecord } from '../types'
import {
  MAX_IMPORT_FILE_SIZE_BYTES,
  SAMPLE_CONCEPTS_CSV,
  buildConceptImportErrorsCsv,
  buildConceptsCsv,
  parseConceptImportCsv,
} from '../csv/csvUtils'
import type { ConceptImportSummary } from '../csv/types'

type UseConceptImportParams = {
  concepts: ConceptRecord[]
  conceptTypes: ConceptTypeRecord[]
  reloadConcepts: () => Promise<void>
  setMessage: (value: string | null) => void
  setError: (value: string | null) => void
}

export function useConceptImport({
  concepts,
  conceptTypes,
  reloadConcepts,
  setMessage,
  setError,
}: UseConceptImportParams) {
  const [importCsvText, setImportCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ConceptImportSummary | null>(null)
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [importFileError, setImportFileError] = useState<string | null>(null)

  const clearFileStatus = () => {
    setImportFileName(null)
    setImportFileError(null)
  }

  const clearImportFields = () => {
    setImportCsvText('')
    setImportSummary(null)
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
        parseConceptImportCsv(text)
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

  const importConcepts = async () => {
    setMessage(null)
    setError(null)
    setImportSummary(null)
    setImportFileError(null)

    if (!importCsvText.trim()) {
      setError('Paste CSV content or choose a CSV file first.')
      return
    }

    let rows
    try {
      rows = parseConceptImportCsv(importCsvText)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError))
      return
    }

    setImporting(true)
    try {
      const { summary, fatalError } = await importConceptRows(rows, conceptTypes, concepts)
      await reloadConcepts()

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

  const exportConcepts = () => {
    const csv = buildConceptsCsv(concepts, conceptTypes)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `concept-models-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setMessage(`Exported ${concepts.length} concept rows.`)
    setError(null)
  }

  const downloadSampleCsv = () => {
    const blob = new Blob([`${SAMPLE_CONCEPTS_CSV}\n`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'concept-models-sample.csv'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setMessage('Downloaded concept model sample CSV template.')
    setError(null)
  }

  const downloadImportErrorsCsv = () => {
    if (!importSummary || importSummary.failures.length === 0) {
      return
    }

    const csv = buildConceptImportErrorsCsv(importSummary.failures)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `concept-import-errors-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setMessage(`Downloaded ${importSummary.failures.length} concept import error rows.`)
  }

  return {
    importCsvText,
    setImportCsvText,
    importing,
    importSummary,
    importFileName,
    importFileError,
    onImportFileSelected,
    importConcepts,
    exportConcepts,
    downloadSampleCsv,
    downloadImportErrorsCsv,
    clearImportFields,
    clearFileStatus,
  }
}
