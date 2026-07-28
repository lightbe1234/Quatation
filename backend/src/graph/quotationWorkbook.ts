import type { SavedQuotation } from '../types/quotation.js'
import type { Store } from '../types/store.js'
import { buildQuotationTableLayout } from './quotationTableFormatting.js'

export const quotationWorksheet = 'Quatation'
export const summaryWorksheet = 'summry'
export const summaryTemplateAddress = 'A1:H2'
export const summaryDataAddress = 'A2:H2'

export type WorkbookRangeWrite = {
  address: string
  values: unknown[][]
}

function blank(value: string | null) {
  return value ?? ''
}

export function toExcelDateSerial(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000 + 25_569
}

export function buildQuotationWrites(
  quotation: SavedQuotation,
  store: Store,
): WorkbookRangeWrite[] {
  const tableLayout = buildQuotationTableLayout(quotation.items.length)
  const itemRows = Array.from(
    { length: 12 },
    (_, index) => quotation.items[index],
  )
  const totalItemIndex = quotation.items.length

  return [
    {
      address: 'H9:H14',
      values: [
        [toExcelDateSerial(quotation.quoteDate)],
        [blank(quotation.jobNo)],
        [quotation.qtnNo],
        [blank(quotation.unit)],
        [blank(store.branch)],
        [blank(store.branchId)],
      ],
    },
    { address: 'B15', values: [[quotation.clientName]] },
    { address: 'B16', values: [[blank(store.contactName)]] },
    { address: 'C17', values: [[quotation.region]] },
    { address: 'B18', values: [[blank(quotation.subject)]] },
    { address: 'A21', values: [[blank(quotation.introLine1)]] },
    { address: 'A22', values: [[blank(quotation.introLine2)]] },
    {
      address: 'A26:A37',
      values: itemRows.map((item, index) => [
        item?.lineNo ??
          (index === totalItemIndex ? 'TOTAL >>>>>>>>>>>' : ''),
      ]),
    },
    {
      address: 'B26:B37',
      values: itemRows.map((item) => [item?.description ?? '']),
    },
    {
      address: 'F26:H37',
      values: itemRows.map((item, index) =>
        item
          ? [item.qty, item.unitPrice, item.totalPrice]
          : [
              '',
              '',
              index === totalItemIndex ? quotation.grandTotal : '',
            ],
      ),
    },
    {
      address: 'A38:H38',
      values: [
        tableLayout.totalRow === 38
          ? [
              'TOTAL >>>>>>>>>>>',
              '',
              '',
              '',
              '',
              '',
              '',
              quotation.grandTotal,
            ]
          : ['', '', '', '', '', '', '', ''],
      ],
    },
  ]
}

export function buildSummaryRow(
  quotation: SavedQuotation,
  store: Store,
) {
  const outletName = blank(store.branch)
  const scopeOfWork = quotation.items
    .map((item) => `(${item.description})`)
    .join(' ')

  return [
    1,
    quotation.qtnNo,
    outletName,
    quotation.grandTotal,
    scopeOfWork,
    'NOT DONE',
    'AWAITED',
    'AWAITED',
  ]
}

export function buildSummaryWrite(
  quotation: SavedQuotation,
  store: Store,
): WorkbookRangeWrite {
  return {
    address: summaryDataAddress,
    values: [buildSummaryRow(quotation, store)],
  }
}
