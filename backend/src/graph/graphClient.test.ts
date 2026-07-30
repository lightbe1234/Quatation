import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors/appError.js'
import { GraphClient } from './graphClient.js'

const authService = {
  getAccessToken: vi.fn(async () => 'access-token'),
}

function mockErrorResponse(body: string) {
  return {
    ok: false,
    status: 409,
    text: vi.fn(async () => body),
  } as Response
}

describe('GraphClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('maps workbook lock failures to a clear AppError for JSON requests', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockErrorResponse(
      JSON.stringify({
        error: {
          code: 'EditModeCannotAcquireLock',
          message: 'shahab uddin is editing this workbook.',
        },
      }),
    )))

    const client = new GraphClient(authService as never)

    await expect(
      client.request('/me/drive/items/item-id/workbook/createSession', {
        method: 'POST',
      }),
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 409,
      message:
        'The workbook is currently open in Excel. Close Web app.xlsx and try generating the PDF again.',
    })
  })

  it('maps workbook lock failures to a clear AppError for binary requests', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockErrorResponse(
      JSON.stringify({
        error: {
          code: 'accessConflict',
          message: 'The request failed due to conflicts with other clients.',
        },
      }),
    )))

    const client = new GraphClient(authService as never)

    await expect(
      client.requestBinary('/me/drive/items/item-id/content?format=pdf'),
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 409,
      message:
        'The workbook is currently open in Excel. Close Web app.xlsx and try generating the PDF again.',
    })
  })

  it('maps a timed-out Graph request to a clear retryable error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => {
              reject(
                new DOMException(
                  'The operation was aborted due to timeout',
                  'TimeoutError',
                ),
              )
            })
          }),
      ),
    )

    const client = new GraphClient(authService as never, 5)

    await expect(client.request('/me/drive')).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 504,
      message:
        'Microsoft Graph took too long to respond. Please try again.',
    })
  })

  it('maps a Graph network failure to a clear retryable error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )

    const client = new GraphClient(authService as never)

    await expect(client.request('/me/drive')).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 502,
      message:
        'Microsoft Graph could not be reached. Check the connection and try again.',
    })
  })
})
