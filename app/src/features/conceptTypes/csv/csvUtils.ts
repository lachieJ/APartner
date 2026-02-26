import { ConceptTypeRecord, ImportFailure, ImportRow } from './types'

export const MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024

export const parseCsvLine = (line: string) => {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += character
  }

  result.push(current.trim())
  return result
}

export const parseImportCsv = (csvText: string): ImportRow[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    throw new Error('CSV needs a header row and at least one data row.')
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const getColumnIndex = (aliases: string[]) => aliases.map((alias) => headers.indexOf(alias)).find((index) => index >= 0) ?? -1

  const nameIndex = getColumnIndex(['name', 'concepttypename'])
  const descriptionIndex = getColumnIndex(['description'])
  const partOfNameIndex = getColumnIndex(['partofname', 'partofconcepttypename', 'partofconcepttype'])
  const partOrderIndex = getColumnIndex(['partorder', 'orderwithinparent', 'order'])
  const referenceToNameIndex = getColumnIndex([
    'referencetoname',
    'referencetoconcepttypename',
    'referencetoconcepttype',
  ])

  if (nameIndex < 0) {
    throw new Error('CSV must include a name column.')
  }

  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseCsvLine(line)
    const name = (cells[nameIndex] ?? '').trim()
    if (!name) {
      throw new Error(`Row ${rowIndex + 2}: name is required.`)
    }

    const description = descriptionIndex >= 0 ? (cells[descriptionIndex] ?? '').trim() || null : null
    const partOfName = partOfNameIndex >= 0 ? (cells[partOfNameIndex] ?? '').trim() || null : null
    const rawPartOrder = partOrderIndex >= 0 ? (cells[partOrderIndex] ?? '').trim() : ''
    let partOrder: number | null = null
    if (rawPartOrder) {
      const parsedPartOrder = Number.parseInt(rawPartOrder, 10)
      if (!Number.isInteger(parsedPartOrder) || parsedPartOrder < 1) {
        throw new Error(`Row ${rowIndex + 2}: partOrder must be a whole number greater than 0.`)
      }
      partOrder = parsedPartOrder
    }
    const referenceToName =
      referenceToNameIndex >= 0 ? (cells[referenceToNameIndex] ?? '').trim() || null : null

    return {
      rowNumber: rowIndex + 2,
      name,
      description,
      partOfName,
      partOrder,
      referenceToName,
    }
  })
}

export const toCsvCell = (value: string | null) => {
  const text = value ?? ''
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export const buildConceptTypesCsv = (conceptTypes: ConceptTypeRecord[]) => {
  const idToName = new Map(conceptTypes.map((item) => [item.id, item.name]))
  const lines: string[] = ['name,description,partOfName,partOrder,referenceToName']

  for (const conceptType of conceptTypes) {
    const partOfName = conceptType.part_of_concept_type_id
      ? idToName.get(conceptType.part_of_concept_type_id) ?? ''
      : ''
    const referenceToName = conceptType.reference_to_concept_type_id
      ? idToName.get(conceptType.reference_to_concept_type_id) ?? ''
      : ''

    lines.push(
      [
        toCsvCell(conceptType.name),
        toCsvCell(conceptType.description),
        toCsvCell(partOfName),
        toCsvCell(conceptType.part_order !== null ? String(conceptType.part_order) : null),
        toCsvCell(referenceToName),
      ].join(','),
    )
  }

  return `${lines.join('\n')}\n`
}

export const buildImportErrorsCsv = (failures: ImportFailure[]) => {
  const lines = ['rowNumber,name,description,partOfName,partOrder,referenceToName,error']
  for (const failure of failures) {
    lines.push(
      [
        String(failure.rowNumber),
        toCsvCell(failure.name),
        toCsvCell(failure.description),
        toCsvCell(failure.partOfName),
        toCsvCell(failure.partOrder !== null ? String(failure.partOrder) : null),
        toCsvCell(failure.referenceToName),
        toCsvCell(failure.error),
      ].join(','),
    )
  }

  return `${lines.join('\n')}\n`
}

export const SAMPLE_CONCEPT_TYPES_CSV = [
  'name,description,partOfName,partOrder,referenceToName',
  'Enterprise,Top-level concept,,,',
  'Value Stream,End-to-end value delivery flow,Enterprise,1,',
  'Owning Enterprise,Owning enterprise link,Value Stream,1,Enterprise',
  'Information Concept,Business information object,Enterprise,2,',
].join('\n')
