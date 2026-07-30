import type {
  QuotationFieldOption,
  QuotationFieldOptionInput,
} from '../types/settings'
import { authenticatedFetch } from './authenticatedFetch'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null

  if (!response.ok || !body) {
    throw new Error(
      body?.error ?? 'The quotation settings request could not be completed',
    )
  }

  return body
}

export async function listQuotationFieldOptions(signal?: AbortSignal) {
  const result = await request<{ options: QuotationFieldOption[] }>(
    '/api/settings/options',
    { signal },
  )
  return result.options
}

export async function createQuotationFieldOption(
  input: QuotationFieldOptionInput,
) {
  const result = await request<{ option: QuotationFieldOption }>(
    '/api/settings/options',
    {
      body: JSON.stringify(input),
      method: 'POST',
    },
  )
  return result.option
}

export async function updateQuotationFieldOption(
  id: string,
  input: QuotationFieldOptionInput,
) {
  const result = await request<{ option: QuotationFieldOption }>(
    `/api/settings/options/${id}`,
    {
      body: JSON.stringify(input),
      method: 'PUT',
    },
  )
  return result.option
}

export function deleteQuotationFieldOption(id: string) {
  return request<void>(`/api/settings/options/${id}`, {
    body: JSON.stringify({ confirmed: true }),
    method: 'DELETE',
  })
}
