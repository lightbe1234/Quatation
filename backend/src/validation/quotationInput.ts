import { AppError } from '../errors/appError.js'
import type {
  QuotationInput,
  QuotationItemInput,
} from '../types/quotation.js'

function readText(
  record: Record<string, unknown>,
  key: string,
  required = false,
) {
  const value = record[key]

  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new AppError(`${key} must be text`, 400)
  }

  const trimmedValue = typeof value === 'string' ? value.trim() : ''

  if (required && !trimmedValue) {
    throw new AppError(`${key} is required`, 400)
  }

  if (trimmedValue.length > 500) {
    throw new AppError(`${key} is too long`, 400)
  }

  return trimmedValue || null
}

function readAmount(
  record: Record<string, unknown>,
  key: 'qty' | 'unitPrice',
  lineNo: number,
) {
  const value = record[key]

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError(`Line ${lineNo} ${key} must be a number`, 400)
  }

  if (new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 })
    .format(value)
    .split('.')[1]?.length > 2) {
    throw new AppError(
      `Line ${lineNo} ${key} must have no more than two decimal places`,
      400,
    )
  }

  if (key === 'qty' && value <= 0) {
    throw new AppError(`Line ${lineNo} quantity must be greater than zero`, 400)
  }

  if (key === 'unitPrice' && value < 0) {
    throw new AppError(`Line ${lineNo} unit price cannot be negative`, 400)
  }

  return value
}

function parseItems(value: unknown): QuotationItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError('At least one line item is required', 400)
  }

  if (value.length > 12) {
    throw new AppError('A quotation can contain no more than 12 line items', 400)
  }

  return value.map((item, index) => {
    const lineNo = index + 1

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new AppError(`Line ${lineNo} is invalid`, 400)
    }

    const record = item as Record<string, unknown>

    return {
      lineNo,
      description: readText(record, 'description', true) as string,
      qty: readAmount(record, 'qty', lineNo),
      unitPrice: readAmount(record, 'unitPrice', lineNo),
    }
  })
}

export function parseQuotationInput(body: unknown): QuotationInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('A valid quotation payload is required', 400)
  }

  const record = body as Record<string, unknown>
  const quoteDate = readText(record, 'quoteDate', true) as string

  if (!/^\d{4}-\d{2}-\d{2}$/.test(quoteDate)) {
    throw new AppError('quoteDate must use YYYY-MM-DD format', 400)
  }

  const storeId = readText(record, 'storeId', true) as string

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      storeId,
    )
  ) {
    throw new AppError('storeId must be a valid store identifier', 400)
  }

  return {
    qtnNo: readText(record, 'qtnNo', true) as string,
    jobNo: readText(record, 'jobNo'),
    quoteDate,
    unit: readText(record, 'unit'),
    clientName: readText(record, 'clientName', true) as string,
    region: readText(record, 'region', true) as string,
    storeId,
    subject: readText(record, 'subject'),
    introLine1: readText(record, 'introLine1'),
    introLine2: readText(record, 'introLine2'),
    items: parseItems(record.items),
  }
}
