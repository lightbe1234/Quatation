import { AppError } from '../errors/appError.js'

export type RecordKind = 'financial'

export type RecordCell = string | number | boolean | null

export type WorkbookRecordRow = {
  rowNumber: number
  values: RecordCell[]
}

export type WorkbookRecordGrid = {
  address: string
  headers: RecordCell[]
  kind: RecordKind
  rows: WorkbookRecordRow[]
  worksheet: string
}

export type RecordConfig = {
  columnCount: number
  endColumn: string
  headers: string[]
  kind: RecordKind
  numericColumns: number[]
  worksheet: string
}

export const financialRecordConfig: RecordConfig = {
  columnCount: 12,
  endColumn: 'L',
  headers: [
    'Specialist',
    'Approval Status',
    'QTN/NO',
    'Store No.',
    'Inv/Type',
    'Job Report',
    'Product Description',
    'Region',
    'QTY',
    'Unit',
    'Before Approval',
    'After Approval',
  ],
  kind: 'financial',
  numericColumns: [8, 10, 11],
  worksheet: 'financial ',
}

export function recordConfig(kind: RecordKind) {
  return financialRecordConfig
}

function normalizeCell(value: unknown): RecordCell {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (value === undefined) {
    return null
  }

  return String(value)
}

export function normalizeRecordRow(
  values: unknown[] | undefined,
  columnCount: number,
) {
  return Array.from({ length: columnCount }, (_, index) =>
    normalizeCell(values?.[index]),
  )
}

export function rowHasContent(values: unknown[] | undefined) {
  return Boolean(
    values?.some(
      (value) => value !== null && value !== undefined && value !== '',
    ),
  )
}

export function buildRecordGrid(
  config: RecordConfig,
  values: unknown[][] | undefined,
  address: string,
): WorkbookRecordGrid {
  const rows = values ?? []
  const headers = rows.length
    ? normalizeRecordRow(rows[0], config.columnCount)
    : config.headers

  return {
    address,
    headers,
    kind: config.kind,
    rows: rows
      .slice(1)
      .map((row, index) => ({
        rowNumber: index + 2,
        values: normalizeRecordRow(row, config.columnCount),
      }))
      .filter((row) => rowHasContent(row.values)),
    worksheet: config.worksheet,
  }
}

export function parseRecordKind(value: unknown): RecordKind {
  if (value === 'financial') {
    return value
  }

  throw new AppError('Record type must be financial', 400)
}

export function parseRowNumber(value: unknown) {
  const rowNumber = Number(value)

  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 1_048_576) {
    throw new AppError('A valid Excel data row number is required', 400)
  }

  return rowNumber
}

export function parseRecordValues(
  config: RecordConfig,
  value: unknown,
) {
  if (!Array.isArray(value) || value.length !== config.columnCount) {
    throw new AppError(
      `${config.kind} records require exactly ${config.columnCount} values`,
      400,
    )
  }

  return value.map((cell, index) => {
    if (cell === null || cell === undefined || cell === '') {
      return ''
    }

    if (config.numericColumns.includes(index)) {
      const numericValue = Number(cell)

      if (!Number.isFinite(numericValue)) {
        throw new AppError(
          `${config.headers[index]} must be a numeric value`,
          400,
        )
      }

      return numericValue
    }

    if (
      typeof cell === 'string' ||
      typeof cell === 'number' ||
      typeof cell === 'boolean'
    ) {
      return String(cell)
    }

    throw new AppError(
      `${config.headers[index]} contains an unsupported value`,
      400,
    )
  })
}
