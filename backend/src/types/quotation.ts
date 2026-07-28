export type QuotationItemInput = {
  lineNo: number
  description: string
  qty: number
  unitPrice: number
}

export type QuotationInput = {
  qtnNo: string
  jobNo: string | null
  quoteDate: string
  unit: string | null
  clientName: string
  region: string
  storeId: string
  subject: string | null
  introLine1: string | null
  introLine2: string | null
  items: QuotationItemInput[]
}

export type SavedQuotationItem = QuotationItemInput & {
  id: string
  totalPrice: number
}

export type SavedQuotation = Omit<QuotationInput, 'items' | 'storeId'> & {
  id: string
  storeId: string | null
  grandTotal: number
  status: string
  pdfGeneratedAt: string | null
  transferredAt: string | null
  createdAt: string
  items: SavedQuotationItem[]
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

export type QuotationRow = {
  id: string
  qtn_no: string
  job_no: string | null
  quote_date: string
  unit: string | null
  client_name: string | null
  region: string | null
  store_id: string | null
  subject: string | null
  intro_line_1: string | null
  intro_line_2: string | null
  grand_total: number
  status: string
  pdf_generated_at: string | null
  transferred_at: string | null
  created_at: string
}

export type QuotationItemRow = {
  id: string
  quotation_id: string
  line_no: number
  description: string
  qty: number
  unit_price: number
  total_price: number
}
