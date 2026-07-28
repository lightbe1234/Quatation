import XlsxPopulate from 'xlsx-populate'
import type { SummaryGrid, SummaryGridCell } from './summaryGrid.js'

const headerFill = '4F7F2B'
const black = '1F2937'
const white = 'FFFFFF'

function excelValue(value: SummaryGridCell) {
  return value ?? ''
}

const thinBorder = {
  top: { style: 'thin', color: black },
  left: { style: 'thin', color: black },
  bottom: { style: 'thin', color: black },
  right: { style: 'thin', color: black },
}

export async function buildSummaryWorkbook(grid: SummaryGrid) {
  const workbook = await XlsxPopulate.fromBlankAsync()
  const worksheet = workbook.sheet(0).name('summry')

  worksheet
    .range('A1:H1')
    .value([grid.headers.map(excelValue)])
    .style({
      fill: headerFill,
      fontColor: white,
      fontFamily: 'Calibri',
      fontSize: 11,
      bold: true,
      horizontalAlignment: 'center',
      verticalAlignment: 'center',
      wrapText: true,
      border: thinBorder,
    })
  worksheet.row(1).height(36)

  grid.rows.forEach((values, index) => {
    const rowNumber = index + 2
    worksheet
      .range(`A${rowNumber}:H${rowNumber}`)
      .value([values.map(excelValue)])
      .style({
        fill: white,
        fontColor: black,
        fontFamily: 'Calibri',
        fontSize: 11,
        bold: true,
        horizontalAlignment: 'center',
        verticalAlignment: 'center',
        wrapText: true,
        border: thinBorder,
      })
    worksheet.row(rowNumber).height(58)
    worksheet.cell(`D${rowNumber}`).style('numberFormat', '#,##0.##')
  })

  const columnWidths = {
    A: 10,
    B: 19,
    C: 19,
    D: 14,
    E: 40,
    F: 17,
    G: 15,
    H: 16,
  }
  Object.entries(columnWidths).forEach(([column, width]) => {
    worksheet.column(column).width(width)
  })

  const output = await workbook.outputAsync()
  if (output instanceof ArrayBuffer) {
    return Buffer.from(output)
  }
  if (output instanceof Uint8Array) {
    return Buffer.from(output)
  }
  if (Buffer.isBuffer(output)) {
    return output
  }

  throw new TypeError('Summary workbook generator returned invalid data')
}
