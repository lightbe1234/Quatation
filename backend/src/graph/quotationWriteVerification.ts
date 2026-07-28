import type { WorkbookRangeWrite } from './quotationWorkbook.js'
import { graphValuesMatch } from './graphWriteVerification.js'

function columnIndex(columnName: string) {
  return [...columnName].reduce(
    (value, character) =>
      value * 26 + character.charCodeAt(0) - 64,
    0,
  ) - 1
}

function startCell(address: string) {
  const match = /^([A-Z]+)(\d+)/.exec(address.toUpperCase())

  if (!match) {
    throw new Error(`Invalid Excel range address: ${address}`)
  }

  return {
    column: columnIndex(match[1]),
    row: Number(match[2]) - 1,
  }
}

export function findQuotationWriteMismatch(
  writes: WorkbookRangeWrite[],
  actualValues: unknown[][] | undefined,
  actualRangeStart = 'A9',
) {
  const actualStart = startCell(actualRangeStart)

  for (const write of writes) {
    const writeStart = startCell(write.address)

    for (let rowIndex = 0; rowIndex < write.values.length; rowIndex += 1) {
      for (
        let columnOffset = 0;
        columnOffset < write.values[rowIndex].length;
        columnOffset += 1
      ) {
        const expected = write.values[rowIndex][columnOffset]

        if (expected === null) {
          continue
        }

        const actualRow =
          writeStart.row - actualStart.row + rowIndex
        const actualColumn =
          writeStart.column - actualStart.column + columnOffset

        if (
          !graphValuesMatch(
            expected,
            actualValues?.[actualRow]?.[actualColumn],
          )
        ) {
          return write.address
        }
      }
    }
  }

  return undefined
}
