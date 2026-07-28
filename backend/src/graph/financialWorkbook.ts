import type { SavedQuotation } from '../types/quotation.js'
import type { Store } from '../types/store.js'

export const financialWorksheet = 'financial '

export function classifyInvoiceType(grandTotal: number) {
  return grandTotal < 2_000 ? 'OPEX' : 'CAPEX'
}

export function buildFinancialRow(
  quotation: SavedQuotation,
  store: Store,
) {
  const productDescription = quotation.items
    .map((item) => `(${item.description})`)
    .join(' ')

  return [
    store.contactName ?? '',
    'Pending',
    quotation.qtnNo,
    store.branch ?? '',
    classifyInvoiceType(quotation.grandTotal),
    quotation.jobNo ?? '',
    productDescription,
    quotation.region,
    quotation.items.length,
    quotation.unit ?? '',
    quotation.grandTotal,
    '',
  ]
}
