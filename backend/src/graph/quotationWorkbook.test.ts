import { describe, expect, it } from 'vitest'
import type { SavedQuotation } from '../types/quotation.js'
import type { Store } from '../types/store.js'
import {
  buildQuotationWrites,
  buildSummaryRow,
  buildSummaryWrite,
  toExcelDateSerial,
} from './quotationWorkbook.js'

const quotation: SavedQuotation = {
  id: 'quotation-id',
  qtnNo: 'QTN-100',
  jobNo: 'JOB-200',
  quoteDate: '2026-07-23',
  unit: 'Maintenance',
  clientName: "McDonald's",
  region: 'Quotation Region',
  storeId: 'store-id',
  subject: 'Pressure tank repair',
  introLine1: 'First introduction',
  introLine2: 'Second introduction',
  grandTotal: 19.19,
  status: 'DRAFT',
  pdfGeneratedAt: null,
  transferredAt: null,
  createdAt: '2026-07-23T00:00:00.000Z',
  items: [
    {
      id: 'item-1',
      lineNo: 1,
      description: 'First item',
      qty: 1.25,
      unitPrice: 10.02,
      totalPrice: 12.53,
    },
    {
      id: 'item-2',
      lineNo: 2,
      description: 'Second item',
      qty: 2,
      unitPrice: 3.33,
      totalPrice: 6.66,
    },
  ],
}

const store: Store = {
  id: 'store-id',
  storeNo: '1830120',
  storeName: 'Duwadmi',
  contactName: 'Mr. Ahmed',
  branch: 'Duwadmi',
  branchId: 'BRN-101',
  region: 'North Region',
  clientName: null,
  createdAt: '2026-07-23T00:00:00.000Z',
}

describe('quotation workbook mapping', () => {
  it('maps every confirmed quotation cell and item columns', () => {
    const writes = buildQuotationWrites(quotation, store)
    const byAddress = new Map(
      writes.map((write) => [write.address, write.values]),
    )

    expect(byAddress.get('H9:H14')).toEqual([
      [toExcelDateSerial('2026-07-23')],
      ['JOB-200'],
      ['QTN-100'],
      ['Maintenance'],
      ['Duwadmi'],
      ['BRN-101'],
    ])
    expect(byAddress.get('B15')).toEqual([["McDonald's"]])
    expect(byAddress.get('B16')).toEqual([['Mr. Ahmed']])
    expect(byAddress.get('C17')).toEqual([['Quotation Region']])
    expect(byAddress.get('B18')).toEqual([['Pressure tank repair']])
    expect(byAddress.get('A21')).toEqual([['First introduction']])
    expect(byAddress.get('A22')).toEqual([['Second introduction']])
    expect(byAddress.get('A26:A37')).toEqual([
      [1],
      [2],
      ['TOTAL >>>>>>>>>>>'],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
    ])
    expect(byAddress.get('B26:B37')).toEqual([
      ['First item'],
      ['Second item'],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
      [''],
    ])
    expect(byAddress.get('F26:H37')).toEqual([
      [1.25, 10.02, 12.53],
      [2, 3.33, 6.66],
      ['', '', 19.19],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ])
    expect(byAddress.get('A38:H38')).toEqual([
      ['', '', '', '', '', '', '', ''],
    ])
  })

  it.each([1, 3, 12])(
    'writes TOTAL immediately after %i item(s)',
    (itemCount) => {
      const grandTotal = itemCount * 10
      const writes = buildQuotationWrites(
        {
          ...quotation,
          grandTotal,
          items: Array.from({ length: itemCount }, (_, index) => ({
            ...quotation.items[0],
            id: `item-${index + 1}`,
            lineNo: index + 1,
            totalPrice: 10,
          })),
        },
        store,
      )
      const byAddress = new Map(
        writes.map((write) => [write.address, write.values]),
      )
      const serialValues = byAddress.get('A26:A37')
      const amountValues = byAddress.get('F26:H37')
      const row38Values = byAddress.get('A38:H38')

      if (itemCount < 12) {
        expect(serialValues?.[itemCount]).toEqual([
          'TOTAL >>>>>>>>>>>',
        ])
        expect(amountValues?.[itemCount]).toEqual([
          '',
          '',
          grandTotal,
        ])
        expect(row38Values).toEqual([
          ['', '', '', '', '', '', '', ''],
        ])
      } else {
        expect(serialValues?.[11]).toEqual([12])
        expect(amountValues?.[11]).toEqual([1.25, 10.02, 10])
        expect(row38Values).toEqual([
          [
            'TOTAL >>>>>>>>>>>',
            '',
            '',
            '',
            '',
            '',
            '',
            grandTotal,
          ],
        ])
      }
    },
  )

  it('builds the reusable fixed Summary row defaults', () => {
    expect(buildSummaryRow(quotation, store)).toEqual([
      1,
      'QTN-100',
      'Duwadmi',
      19.19,
      '(First item) (Second item)',
      'NOT DONE',
      'AWAITED',
      'AWAITED',
    ])
    expect(buildSummaryWrite(quotation, store)).toEqual({
      address: 'A2:H2',
      values: [
        [
          1,
          'QTN-100',
          'Duwadmi',
          19.19,
          '(First item) (Second item)',
          'NOT DONE',
          'AWAITED',
          'AWAITED',
        ],
      ],
    })
  })
})
