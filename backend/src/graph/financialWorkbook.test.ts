import { describe, expect, it } from 'vitest'
import type { SavedQuotation } from '../types/quotation.js'
import type { Store } from '../types/store.js'
import {
  buildFinancialRow,
  classifyInvoiceType,
} from './financialWorkbook.js'

const store: Store = {
  id: 'store-id',
  storeNo: '111111',
  storeName: 'Test Store',
  contactName: 'Mr. Contact',
  branch: 'Test Branch',
  branchId: 'BRN-1',
  region: 'North Region',
  clientName: null,
  createdAt: '2026-07-23T00:00:00.000Z',
}

function quotation(grandTotal: number): SavedQuotation {
  return {
    id: 'quotation-id',
    qtnNo: 'QTN-100',
    jobNo: 'JOB-100',
    quoteDate: '2026-07-23',
    unit: 'Maintenance',
    clientName: "McDonald's",
    region: 'Quotation Region',
    storeId: store.id,
    subject: 'Test',
    introLine1: null,
    introLine2: null,
    grandTotal,
    status: 'PDF_GENERATED',
    pdfGeneratedAt: '2026-07-23T00:00:00.000Z',
    transferredAt: null,
    createdAt: '2026-07-23T00:00:00.000Z',
    items: [
      {
        id: 'item-1',
        lineNo: 1,
        description: 'First item',
        qty: 10,
        unitPrice: 100,
        totalPrice: 1_000,
      },
      {
        id: 'item-2',
        lineNo: 2,
        description: 'Second item',
        qty: 5,
        unitPrice: 100,
        totalPrice: 500,
      },
    ],
  }
}

describe('financial workbook mapping', () => {
  it('uses OPEX below 2000 and CAPEX from 2000', () => {
    expect(classifyInvoiceType(1_999.99)).toBe('OPEX')
    expect(classifyInvoiceType(2_000)).toBe('CAPEX')
  })

  it('maps confirmed defaults and counts item rows for QTY', () => {
    expect(buildFinancialRow(quotation(1_500), store)).toEqual([
      'Mr. Contact',
      'Pending',
      'QTN-100',
      'Test Branch',
      'OPEX',
      'JOB-100',
      '(First item) (Second item)',
      'Quotation Region',
      2,
      'Maintenance',
      1_500,
      '',
    ])
  })
})
