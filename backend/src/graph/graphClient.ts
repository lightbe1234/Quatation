import { AppError } from '../errors/appError.js'
import type { MicrosoftAuthService } from '../auth/microsoftAuthService.js'

function toGraphLockError(body: string) {
  if (
    body.includes('EditModeCannotAcquireLock') ||
    body.includes('accessConflict')
  ) {
    return new AppError(
      'The workbook is currently open in Excel. Close Web app.xlsx and try generating the PDF again.',
      409,
    )
  }

  return undefined
}

export type GraphBatchRequest = {
  id: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: unknown
}

export class GraphClient {
  constructor(private readonly authService: MicrosoftAuthService) {}

  private async fetchWithAuth(
    requestUrl: string,
    options: RequestInit = {},
    includeJsonContentType = true,
  ) {
    const accessToken = await this.authService.getAccessToken()
    return fetch(requestUrl, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(includeJsonContentType
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...options.headers,
      },
    })
  }

  private async assertOk(
    response: Response,
    requestUrl: string,
    method: string,
  ) {
    if (response.ok) {
      return
    }

    const body = await response.text().catch(() => '')
    const bodyPreview = body.trim() || '<empty response body>'
    console.error(
      `Microsoft Graph ${method} ${requestUrl} failed:`,
      response.status,
      bodyPreview,
    )
    const lockError = response.status === 409
      ? toGraphLockError(bodyPreview)
      : undefined

    if (lockError) {
      throw lockError
    }

    throw new AppError(
      `Microsoft Graph request failed with status ${response.status}`,
      502,
    )
  }

  async request<T>(path: string, options: RequestInit = {}) {
    const requestUrl = `https://graph.microsoft.com/v1.0${path}`
    const response = await this.fetchWithAuth(requestUrl, options)
    await this.assertOk(response, requestUrl, options.method ?? 'GET')

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  async requestResponse(path: string, options: RequestInit = {}) {
    const requestUrl = `https://graph.microsoft.com/v1.0${path}`
    const response = await this.fetchWithAuth(requestUrl, options)
    await this.assertOk(response, requestUrl, options.method ?? 'GET')
    return response
  }

  async requestAbsolute<T>(requestUrl: string, options: RequestInit = {}) {
    const response = await this.fetchWithAuth(requestUrl, options)
    await this.assertOk(response, requestUrl, options.method ?? 'GET')

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  async requestBatch(
    requests: GraphBatchRequest[],
  ) {
    const result = await this.request<{
      responses: Array<{
        id: string
        status: number
        body?: unknown
      }>
    }>('/$batch', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    })
    const failed = result.responses.find(
      (response) => response.status < 200 || response.status >= 300,
    )

    if (failed) {
      console.error(
        'Microsoft Graph batch subrequest failed:',
        failed.id,
        failed.status,
        JSON.stringify(failed.body ?? {}),
      )
      throw new AppError(
        `Microsoft Graph batch request failed with status ${failed.status}`,
        502,
      )
    }
  }

  async requestBinary(path: string, options: RequestInit = {}) {
    const requestUrl = `https://graph.microsoft.com/v1.0${path}`
    const response = await this.fetchWithAuth(
      requestUrl,
      { ...options, redirect: 'follow' },
      false,
    )
    await this.assertOk(response, requestUrl, options.method ?? 'GET')

    return Buffer.from(await response.arrayBuffer())
  }
}
