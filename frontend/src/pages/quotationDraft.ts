import type {
  QuotationDraft,
  QuotationLineDraft,
} from '../types/quotation'

function localDate() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function createEmptyQuotationLine(): QuotationLineDraft {
  return {
    id: crypto.randomUUID(),
    description: '',
    qty: '1',
    unitPrice: '',
  }
}

export function createEmptyQuotationDraft(): QuotationDraft {
  return {
    qtnNo: '',
    jobNo: '',
    quoteDate: localDate(),
    unit: '',
    clientName: '',
    region: '',
    storeId: '',
    subject: '',
    introLine1: '',
    introLine2: '',
    items: [createEmptyQuotationLine()],
  }
}
