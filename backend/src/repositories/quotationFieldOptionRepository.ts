import { AppError } from '../errors/appError.js'
import { getSupabaseClient } from '../lib/supabase.js'
import type {
  QuotationFieldOption,
  QuotationFieldOptionInput,
  QuotationFieldOptionRow,
} from '../types/quotationFieldOption.js'

export interface QuotationFieldOptionRepository {
  list(): Promise<QuotationFieldOption[]>
  create(input: QuotationFieldOptionInput): Promise<QuotationFieldOption>
  update(
    id: string,
    input: QuotationFieldOptionInput,
  ): Promise<QuotationFieldOption>
  delete(id: string): Promise<void>
}

function toOption(row: QuotationFieldOptionRow): QuotationFieldOption {
  return {
    id: row.id,
    fieldKey: row.field_key,
    optionValue: row.option_value,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: QuotationFieldOptionInput) {
  return {
    field_key: input.fieldKey,
    option_value: input.optionValue,
    sort_order: input.sortOrder,
  }
}

function handleDatabaseError(error: { code?: string; message: string }): never {
  if (error.code === '23505') {
    throw new AppError('This value already exists for this field', 409)
  }

  console.error('Supabase quotation option operation failed:', error.message)
  throw new AppError('The quotation option database operation failed', 502)
}

export class SupabaseQuotationFieldOptionRepository
  implements QuotationFieldOptionRepository
{
  async list() {
    const { data, error } = await getSupabaseClient()
      .from('quotation_field_options')
      .select('*')
      .order('field_key')
      .order('sort_order')
      .order('option_value')

    if (error) {
      handleDatabaseError(error)
    }

    return (data as QuotationFieldOptionRow[]).map(toOption)
  }

  async create(input: QuotationFieldOptionInput) {
    const { data, error } = await getSupabaseClient()
      .from('quotation_field_options')
      .insert(toRow(input))
      .select()
      .single()

    if (error) {
      handleDatabaseError(error)
    }

    return toOption(data as QuotationFieldOptionRow)
  }

  async update(id: string, input: QuotationFieldOptionInput) {
    const { data, error } = await getSupabaseClient()
      .from('quotation_field_options')
      .update(toRow(input))
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      handleDatabaseError(error)
    }
    if (!data) {
      throw new AppError('Quotation option not found', 404)
    }

    return toOption(data as QuotationFieldOptionRow)
  }

  async delete(id: string) {
    const { data, error } = await getSupabaseClient()
      .from('quotation_field_options')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) {
      handleDatabaseError(error)
    }
    if (!data) {
      throw new AppError('Quotation option not found', 404)
    }
  }
}
