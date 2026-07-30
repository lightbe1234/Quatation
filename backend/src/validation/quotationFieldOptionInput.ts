import { AppError } from '../errors/appError.js'
import {
  quotationFieldKeys,
  type QuotationFieldKey,
  type QuotationFieldOptionInput,
} from '../types/quotationFieldOption.js'

function isFieldKey(value: unknown): value is QuotationFieldKey {
  return (
    typeof value === 'string' &&
    quotationFieldKeys.includes(value as QuotationFieldKey)
  )
}

export function parseQuotationFieldOptionInput(
  body: unknown,
): QuotationFieldOptionInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('A valid quotation option payload is required', 400)
  }

  const record = body as Record<string, unknown>

  if (!isFieldKey(record.fieldKey)) {
    throw new AppError('fieldKey is not a supported quotation field', 400)
  }

  if (typeof record.optionValue !== 'string') {
    throw new AppError('optionValue must be text', 400)
  }

  const optionValue = record.optionValue.trim()
  if (!optionValue) {
    throw new AppError('optionValue is required', 400)
  }
  if (optionValue.length > 500) {
    throw new AppError('optionValue must be 500 characters or fewer', 400)
  }

  const sortOrder = record.sortOrder ?? 0
  if (
    typeof sortOrder !== 'number' ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0
  ) {
    throw new AppError('sortOrder must be a non-negative integer', 400)
  }

  return {
    fieldKey: record.fieldKey,
    optionValue,
    sortOrder,
  }
}
