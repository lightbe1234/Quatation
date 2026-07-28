export type QuotationLineDraft = {
  id: string
  description: string
  qty: string
  unitPrice: string
}

export type QuotationDraft = {
  qtnNo: string
  jobNo: string
  quoteDate: string
  unit: string
  clientName: string
  region: string
  storeId: string
  subject: string
  introLine1: string
  introLine2: string
  items: QuotationLineDraft[]
}

export type QuotationPayload = Omit<QuotationDraft, 'items'> & {
  items: Array<{
    description: string
    qty: number
    unitPrice: number
  }>
}

export type SavedQuotation = Omit<QuotationPayload, 'storeId'> & {
  id: string
  storeId: string | null
  grandTotal: number
  status: string
  pdfGeneratedAt: string | null
  transferredAt: string | null
  createdAt: string
}

export type RecentQuotation = {
  id: string
  qtnNo: string
  storeId: string | null
  grandTotal: number
  status: string
  pdfGeneratedAt: string | null
  transferredAt: string | null
  createdAt: string
}
