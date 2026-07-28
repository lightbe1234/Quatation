import { AppError } from '../errors/appError.js'
import type { StoreInput } from '../types/store.js'

function readText(
  record: Record<string, unknown>,
  key: keyof StoreInput,
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

  if (trimmedValue.length > 200) {
    throw new AppError(`${key} must be 200 characters or fewer`, 400)
  }

  return trimmedValue || null
}

export function parseStoreInput(body: unknown): StoreInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('A valid store payload is required', 400)
  }

  const record = body as Record<string, unknown>
  const branch = readText(record, 'branch', true) as string
  const branchId = readText(record, 'branchId', true) as string

  return {
    storeNo: branchId,
    storeName: branch,
    contactName: readText(record, 'contactName'),
    branch,
    branchId,
    region: null,
    clientName: null,
  }
}
