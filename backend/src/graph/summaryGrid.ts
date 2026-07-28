export type SummaryGridCell = string | number | boolean | null

export type SummaryGrid = {
  address: string
  headers: SummaryGridCell[]
  rows: SummaryGridCell[][]
  worksheet: 'summry'
}

const summaryColumnCount = 8

function normalizeCell(value: unknown): SummaryGridCell {
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

function normalizeRow(row: unknown[] | undefined) {
  return Array.from({ length: summaryColumnCount }, (_, column) =>
    normalizeCell(row?.[column]),
  )
}

export function buildSummaryGrid(
  values: unknown[][] | undefined,
  address: string,
): SummaryGrid {
  if (!values?.length) {
    return {
      address,
      headers: [],
      rows: [],
      worksheet: 'summry',
    }
  }

  return {
    address,
    headers: normalizeRow(values[0]),
    rows: values.slice(1).map(normalizeRow),
    worksheet: 'summry',
  }
}
