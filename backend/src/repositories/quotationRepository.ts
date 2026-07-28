import { calculateGrandTotal } from '../calculations/quotationTotals.js'
import { AppError } from '../errors/appError.js'
import { getSupabaseClient } from '../lib/supabase.js'
import type {
  QuotationInput,
  QuotationItemRow,
  QuotationRow,
  RecentQuotation,
  SavedQuotation,
  SavedQuotationItem,
} from '../types/quotation.js'

export interface QuotationRepository {
  listRecent(): Promise<RecentQuotation[]>
  create(input: QuotationInput): Promise<SavedQuotation>
  findById(id: string): Promise<SavedQuotation>
  markPdfGenerated(id: string): Promise<SavedQuotation>
  markTransferred(id: string): Promise<SavedQuotation>
}

function handleDatabaseError(error: { code?: string; message: string }): never {
  if (
    error.message.includes("Could not find the 'client_name' column") ||
    error.message.includes('column "client_name" of relation "quotations" does not exist')
  ) {
    throw new AppError(
      'Supabase is missing quotations.client_name. Apply migration 0002_add_quotation_client_name.sql, then save again.',
      500,
    )
  }

  if (
    error.message.includes("Could not find the 'region' column") ||
    error.message.includes('column "region" of relation "quotations" does not exist')
  ) {
    throw new AppError(
      'Supabase is missing quotations.region. Apply migration 0003_add_quotation_region.sql, then save again.',
      500,
    )
  }

  if (error.code === '23505') {
    throw new AppError('A quotation with this QTN # already exists', 409)
  }

  if (error.code === '23503') {
    throw new AppError('The selected store no longer exists', 400)
  }

  console.error('Supabase quotation operation failed:', error.message)
  throw new AppError('The quotation database operation failed', 502)
}

function toSavedItem(row: QuotationItemRow): SavedQuotationItem {
  return {
    id: row.id,
    lineNo: row.line_no,
    description: row.description,
    qty: Number(row.qty),
    unitPrice: Number(row.unit_price),
    totalPrice: Number(row.total_price),
  }
}

function toSavedQuotation(
  row: QuotationRow,
  itemRows: QuotationItemRow[],
): SavedQuotation {
  return {
    id: row.id,
    qtnNo: row.qtn_no,
    jobNo: row.job_no,
    quoteDate: row.quote_date,
    unit: row.unit,
    clientName: row.client_name ?? '',
    region: row.region ?? '',
    storeId: row.store_id,
    subject: row.subject,
    introLine1: row.intro_line_1,
    introLine2: row.intro_line_2,
    grandTotal: Number(row.grand_total),
    status: row.status,
    pdfGeneratedAt: row.pdf_generated_at,
    transferredAt: row.transferred_at,
    createdAt: row.created_at,
    items: itemRows.map(toSavedItem),
  }
}

export class SupabaseQuotationRepository implements QuotationRepository {
  async listRecent() {
    const { data, error } = await getSupabaseClient()
      .from('quotations')
      .select(
        'id,qtn_no,store_id,grand_total,status,pdf_generated_at,transferred_at,created_at',
      )
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      handleDatabaseError(error)
    }

    return data.map(
      (row): RecentQuotation => ({
        id: row.id,
        qtnNo: row.qtn_no,
        storeId: row.store_id,
        grandTotal: Number(row.grand_total),
        status: row.status,
        pdfGeneratedAt: row.pdf_generated_at,
        transferredAt: row.transferred_at,
        createdAt: row.created_at,
      }),
    )
  }

  async create(input: QuotationInput) {
    const client = getSupabaseClient()
    const grandTotal = calculateGrandTotal(input.items)
    const { data: quotation, error: quotationError } = await client
      .from('quotations')
      .insert({
        qtn_no: input.qtnNo,
        job_no: input.jobNo,
        quote_date: input.quoteDate,
        unit: input.unit,
        client_name: input.clientName,
        region: input.region,
        store_id: input.storeId,
        subject: input.subject,
        intro_line_1: input.introLine1,
        intro_line_2: input.introLine2,
        grand_total: grandTotal,
        status: 'DRAFT',
      })
      .select()
      .single()

    if (quotationError) {
      handleDatabaseError(quotationError)
    }

    const quotationRow = quotation as QuotationRow
    const { data: items, error: itemsError } = await client
      .from('quotation_items')
      .insert(
        input.items.map((item) => ({
          quotation_id: quotationRow.id,
          line_no: item.lineNo,
          description: item.description,
          qty: item.qty,
          unit_price: item.unitPrice,
        })),
      )
      .select()

    if (itemsError) {
      const { error: cleanupError } = await client
        .from('quotations')
        .delete()
        .eq('id', quotationRow.id)

      if (cleanupError) {
        console.error(
          'Failed to clean up quotation after item insert:',
          cleanupError.message,
        )
      }

      handleDatabaseError(itemsError)
    }

    return toSavedQuotation(
      quotationRow,
      (items as QuotationItemRow[]).sort(
        (first, second) => first.line_no - second.line_no,
      ),
    )
  }

  async findById(id: string) {
    const client = getSupabaseClient()
    const { data: quotation, error: quotationError } = await client
      .from('quotations')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (quotationError) {
      handleDatabaseError(quotationError)
    }

    if (!quotation) {
      throw new AppError('Quotation not found', 404)
    }

    const { data: items, error: itemsError } = await client
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', id)
      .order('line_no')

    if (itemsError) {
      handleDatabaseError(itemsError)
    }

    return toSavedQuotation(
      quotation as QuotationRow,
      items as QuotationItemRow[],
    )
  }

  async markPdfGenerated(id: string) {
    const client = getSupabaseClient()
    const generatedAt = new Date().toISOString()
    const existing = await this.findById(id)
    const { data, error } = await client
      .from('quotations')
      .update({
        status:
          existing.status === 'TRANSFERRED'
            ? 'TRANSFERRED'
            : 'PDF_GENERATED',
        pdf_generated_at: generatedAt,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      handleDatabaseError(error)
    }

    if (!data) {
      throw new AppError('Quotation not found', 404)
    }

    const { data: items, error: itemsError } = await client
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', id)
      .order('line_no')

    if (itemsError) {
      handleDatabaseError(itemsError)
    }

    return toSavedQuotation(
      data as QuotationRow,
      items as QuotationItemRow[],
    )
  }

  async markTransferred(id: string) {
    const client = getSupabaseClient()
    const transferredAt = new Date().toISOString()
    const { data, error } = await client
      .from('quotations')
      .update({
        status: 'TRANSFERRED',
        transferred_at: transferredAt,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      handleDatabaseError(error)
    }

    if (!data) {
      throw new AppError('Quotation not found', 404)
    }

    const { data: items, error: itemsError } = await client
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', id)
      .order('line_no')

    if (itemsError) {
      handleDatabaseError(itemsError)
    }

    return toSavedQuotation(
      data as QuotationRow,
      items as QuotationItemRow[],
    )
  }
}
