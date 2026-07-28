import { describe, expect, it } from 'vitest'
import { buildSummaryGrid } from './summaryGrid.js'

describe('buildSummaryGrid', () => {
  it('keeps the Summary worksheet in an eight-column rectangular grid', () => {
    expect(
      buildSummaryGrid(
        [
          ['SNO', 'QUOTATION REF', 'OUTLET NAME'],
          [1, 'QTN-1', 'Store 1', 25, null, 'NOT DONE'],
        ],
        'A1:H2',
      ),
    ).toEqual({
      address: 'A1:H2',
      worksheet: 'summry',
      headers: [
        'SNO',
        'QUOTATION REF',
        'OUTLET NAME',
        null,
        null,
        null,
        null,
        null,
      ],
      rows: [
        [1, 'QTN-1', 'Store 1', 25, null, 'NOT DONE', null, null],
      ],
    })
  })
})
