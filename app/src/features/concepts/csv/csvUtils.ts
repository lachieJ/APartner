import { MAX_IMPORT_FILE_SIZE_BYTES as MAX_BASE_FILE_SIZE, parseCsvLine, toCsvCell } from '../../conceptTypes/csv/csvUtils'
import type { ConceptTypeRecord } from '../../conceptTypes/types/domain'
import type { ConceptRecord } from '../types'
import type { ConceptImportFailure, ConceptImportRow } from './types'

export const MAX_IMPORT_FILE_SIZE_BYTES = MAX_BASE_FILE_SIZE

export const parseConceptImportCsv = (csvText: string): ConceptImportRow[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    throw new Error('CSV needs a header row and at least one data row.')
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const getColumnIndex = (aliases: string[]) => aliases.map((alias) => headers.indexOf(alias)).find((index) => index >= 0) ?? -1

  const nameIndex = getColumnIndex(['name', 'conceptname'])
  const descriptionIndex = getColumnIndex(['description'])
  const conceptTypeNameIndex = getColumnIndex(['concepttypename', 'type', 'typeName'.toLowerCase()])
  const partOfNameIndex = getColumnIndex(['partofname', 'partofconceptname'])
  const partOrderIndex = getColumnIndex(['partorder', 'partoforder', 'order', 'orderwithinparent'])
  const referenceToNameIndex = getColumnIndex(['referencetoname', 'referencetoconceptname'])

  if (nameIndex < 0) {
    throw new Error('CSV must include a name column.')
  }

  if (conceptTypeNameIndex < 0) {
    throw new Error('CSV must include a conceptTypeName column.')
  }

  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line)
    const name = (cells[nameIndex] ?? '').trim()
    const conceptTypeName = (cells[conceptTypeNameIndex] ?? '').trim()
    const partOrderText = partOrderIndex >= 0 ? (cells[partOrderIndex] ?? '').trim() : ''

    if (!name) {
      throw new Error(`Row ${rowIndex + 2}: name is required.`)
    }

    if (!conceptTypeName) {
      throw new Error(`Row ${rowIndex + 2}: conceptTypeName is required.`)
    }

    let partOrder: number | null = null
    if (partOrderText) {
      const parsedPartOrder = Number.parseInt(partOrderText, 10)
      if (!Number.isInteger(parsedPartOrder) || parsedPartOrder <= 0) {
        throw new Error(`Row ${rowIndex + 2}: partOrder must be a whole number greater than 0.`)
      }
      partOrder = parsedPartOrder
    }

    return {
      rowNumber: rowIndex + 2,
      name,
      description: descriptionIndex >= 0 ? (cells[descriptionIndex] ?? '').trim() || null : null,
      conceptTypeName,
      partOfName: partOfNameIndex >= 0 ? (cells[partOfNameIndex] ?? '').trim() || null : null,
      partOrder,
      referenceToName: referenceToNameIndex >= 0 ? (cells[referenceToNameIndex] ?? '').trim() || null : null,
    }
  })
}

export const buildConceptsCsv = (concepts: ConceptRecord[], conceptTypes: ConceptTypeRecord[]) => {
  const conceptTypeById = new Map(conceptTypes.map((conceptType) => [conceptType.id, conceptType.name]))
  const conceptNameById = new Map(concepts.map((concept) => [concept.id, concept.name]))
  const lines = ['name,description,conceptTypeName,partOfName,partOrder,referenceToName']

  for (const concept of concepts) {
    lines.push(
      [
        toCsvCell(concept.name),
        toCsvCell(concept.description),
        toCsvCell(conceptTypeById.get(concept.concept_type_id) ?? concept.concept_type_id),
        toCsvCell(concept.part_of_concept_id ? conceptNameById.get(concept.part_of_concept_id) ?? '' : ''),
        toCsvCell(concept.part_order !== null ? String(concept.part_order) : ''),
        toCsvCell(concept.reference_to_concept_id ? conceptNameById.get(concept.reference_to_concept_id) ?? '' : ''),
      ].join(','),
    )
  }

  return `${lines.join('\n')}\n`
}

export const buildConceptImportErrorsCsv = (failures: ConceptImportFailure[]) => {
  const lines = ['rowNumber,name,conceptTypeName,partOfName,partOrder,referenceToName,error']

  for (const failure of failures) {
    lines.push(
      [
        String(failure.rowNumber),
        toCsvCell(failure.name),
        toCsvCell(failure.conceptTypeName),
        toCsvCell(failure.partOfName),
        toCsvCell(failure.partOrder !== null ? String(failure.partOrder) : ''),
        toCsvCell(failure.referenceToName),
        toCsvCell(failure.error),
      ].join(','),
    )
  }

  return `${lines.join('\n')}\n`
}

export const SAMPLE_CONCEPTS_CSV = [
  'name,description,conceptTypeName,partOfName,partOrder,referenceToName',
  'Treasury,National treasury department,Enterprise,,,',
  'Tax Administration,Core revenue stream,Value Stream,Treasury,1,',
  'Taxpayer Registry,Core registry concept,Information Concept,Treasury,2,',
].join('\n')
