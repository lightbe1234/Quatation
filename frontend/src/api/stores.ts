import type { Store, StoreInput } from '../types/store'
import { authenticatedFetch } from './authenticatedFetch'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? 'The request could not be completed')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function listStores(signal?: AbortSignal) {
  const result = await apiRequest<{ stores: Store[] }>('/api/stores', {
    signal,
  })
  return result.stores
}

export async function createStore(input: StoreInput) {
  const result = await apiRequest<{ store: Store }>('/api/stores', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.store
}

export async function updateStore(id: string, input: StoreInput) {
  const result = await apiRequest<{ store: Store }>(`/api/stores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return result.store
}

export function deleteStore(id: string) {
  return apiRequest<void>(`/api/stores/${id}`, { method: 'DELETE' })
}
