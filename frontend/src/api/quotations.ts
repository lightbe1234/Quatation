import type {
  QuotationPayload,
  RecentQuotation,
  SavedQuotation,
} from '../types/quotation'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function listRecentQuotations(signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/api/quotations`, { signal })
  const body = (await response.json().catch(() => null)) as {
    quotations?: RecentQuotation[]
    error?: string
  } | null

  if (!response.ok || !body?.quotations) {
    throw new Error(body?.error ?? 'Recent quotations could not be loaded')
  }

  return body.quotations
}

export async function createQuotation(payload: QuotationPayload) {
  const response = await fetch(`${apiBaseUrl}/api/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => null)) as {
    quotation?: SavedQuotation
    error?: string
  } | null

  if (!response.ok || !body?.quotation) {
    throw new Error(body?.error ?? 'The quotation could not be saved')
  }

  return body.quotation
}

export async function generateQuotationPdf(quotationId: string) {
  const response = await fetch(
    `${apiBaseUrl}/api/quotations/${quotationId}/generate-pdf`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true }),
    },
  )

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? 'The PDF could not be generated')
  }

  return {
    blob: await response.blob(),
    summaryStatus:
      response.headers.get('X-Summary-Status') ?? 'created',
  }
}

export async function transferQuotationToFinancial(quotationId: string) {
  const response = await fetch(
    `${apiBaseUrl}/api/quotations/${quotationId}/transfer-financial`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true }),
    },
  )
  const body = (await response.json().catch(() => null)) as {
    result?: {
      status: string
      transferredAt: string
      financialStatus: 'created' | 'already-existed'
    }
    error?: string
  } | null

  if (!response.ok || !body?.result) {
    throw new Error(
      body?.error ?? 'The financial transfer could not be completed',
    )
  }

  return body.result
}
