import { describe, expect, it } from 'vitest'
import XlsxPopulate from 'xlsx-populate'
import type { SummaryGrid } from './summaryGrid.js'
import { buildSummaryWorkbook } from './summaryWorkbook.js'

const grid: SummaryGrid = {
  address: 'A1:H2',
  worksheet: 'summry',
  headers: [
    'SNO',
    'QUOTATION REF',
    'OUTLET NAME',
    'AMOUNT',
    'SCOPE OF WORK',
    'JOB STATUS',
    'HD NO',
    'APPROVAL',
  ],
  rows: [
    [
      1,
      'QTN-100',
      'Store 100',
      2850,
      '(SUPPLY & INSTALLATION)',
      'NOT DONE',
      'AWAITED',
      'AWAITED',
    ],
  ],
}

describe('Summary workbook download', () => {
  it('creates one formatted summry worksheet with the live A1:H2 values', async () => {
    const buffer = await buildSummaryWorkbook(grid)
    const workbook = await XlsxPopulate.fromDataAsync(buffer)

    expect(workbook.sheets()).toHaveLength(1)
    const worksheet = workbook.sheet(0)
    expect(worksheet.name()).toBe('summry')
    expect(worksheet.range('A1:H2').value()).toEqual([
      grid.headers,
      grid.rows[0],
    ])
    expect(worksheet.cell('A1').style('fill')).toMatchObject({
      type: 'solid',
      color: { rgb: '4F7F2B' },
    })
    expect(worksheet.cell('A1').style('bold')).toBe(true)
    expect(worksheet.cell('A1').style('fontColor')).toMatchObject({
      rgb: 'FFFFFF',
    })
    expect(worksheet.cell('A2').style('topBorder')).toMatchObject({
      style: 'thin',
      color: { rgb: '1F2937' },
    })
    expect(worksheet.cell('D2').style('numberFormat')).toBe('#,##0.##')
  })
})
