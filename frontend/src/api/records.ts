export type RecordKind = 'financial'

export type RecordCell = string | number | boolean | null

export type WorkbookRecordRow = {
  rowNumber: number
  values: RecordCell[]
}

export type WorkbookRecordGrid = {
  address: string
  headers: RecordCell[]
  kind: RecordKind
  rows: WorkbookRecordRow[]
  worksheet: string
}

export type WorkbookRecords = {
  financial: WorkbookRecordGrid
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
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
    throw new Error(body?.error ?? 'The Records request could not be completed')
  }

  return body
}

export async function getRecords() {
  const result = await request<{ records: WorkbookRecords }>('/api/records')
  return result.records
}

export async function updateRecordRow(
  rowNumber: number,
  values: RecordCell[],
) {
  const result = await request<{ grid: WorkbookRecordGrid }>(
    `/api/records/financial/${rowNumber}`,
    {
      body: JSON.stringify({ confirmed: true, values }),
      method: 'PUT',
    },
  )
  return result.grid
}

export async function deleteRecordRow(rowNumber: number) {
  const result = await request<{ grid: WorkbookRecordGrid }>(
    `/api/records/financial/${rowNumber}`,
    {
      body: JSON.stringify({ confirmed: true }),
      method: 'DELETE',
    },
  )
  return result.grid
}
