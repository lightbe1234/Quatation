export type OneDriveStatus = {
  connected: boolean
  workbook?: {
    name: string
    connectedAt: string
  }
}

export type TestCellCandidate = {
  worksheet: string
  address: string
  usedRange: string
}

export type SummaryGridCell = string | number | boolean | null

export type SummaryGrid = {
  address: string
  headers: SummaryGridCell[]
  rows: SummaryGridCell[][]
  worksheet: 'summry'
}

import { authenticatedFetch } from './authenticatedFetch'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit) {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null

  if (!response.ok || !body) {
    throw new Error(body?.error ?? 'The OneDrive request could not be completed')
  }

  return body
}

export function getOneDriveStatus() {
  return request<OneDriveStatus>('/api/onedrive/status')
}

export async function refreshPdfTemplate() {
  const result = await request<{
    result: { name: string; refreshedAt: string }
  }>('/api/onedrive/refresh-pdf-template', {
    method: 'POST',
    body: JSON.stringify({ confirmed: true }),
  })
  return result.result
}

export async function inspectTestCell() {
  const result = await request<{ candidate: TestCellCandidate }>(
    '/api/onedrive/inspect-test-cell',
    { method: 'POST' },
  )
  return result.candidate
}

export async function runTestCell(candidate: TestCellCandidate) {
  const result = await request<{
    result: { address: string; verified: true; restored: true }
  }>('/api/onedrive/test-cell', {
    method: 'POST',
    body: JSON.stringify({
      confirmed: true,
      worksheet: candidate.worksheet,
      address: candidate.address,
    }),
  })
  return result.result
}

export async function getSummaryGrid() {
  const result = await request<{ grid: SummaryGrid }>(
    '/api/onedrive/summary-grid',
  )
  return result.grid
}

export async function downloadSummaryWorkbook() {
  const response = await authenticatedFetch(
    `${apiBaseUrl}/api/onedrive/summary-workbook`,
  )

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
    throw new Error(
      body?.error ?? 'The Summary Excel workbook could not be downloaded',
    )
  }

  return response.blob()
}

export function getConnectOneDriveUrl() {
  return `${apiBaseUrl}/connect-onedrive`
}
