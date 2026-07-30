import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticatedFetch } from './authenticatedFetch'

const getSession = vi.hoisted(() => vi.fn())
const refreshSession = vi.hoisted(() => vi.fn())
const signOut = vi.hoisted(() => vi.fn())

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { getSession, refreshSession, signOut },
  }),
}))

describe('authenticatedFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('sends the current Supabase access token to the backend', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
      error: null,
    })
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response('{}'),
    )
    vi.stubGlobal('fetch', fetchMock)

    await authenticatedFetch('https://api.example.test/api/stores')

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(headers.get('Authorization')).toBe('Bearer test-access-token')
  })

  it('stops before the request when the session has expired', async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      authenticatedFetch('https://api.example.test/api/stores'),
    ).rejects.toThrow('Your session has expired. Sign in again.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshes a rejected session once and retries the API request', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'stale-token' } },
      error: null,
    })
    refreshSession.mockResolvedValue({
      data: { session: { access_token: 'fresh-token' } },
      error: null,
    })
    const fetchMock = vi
      .fn<
        (
          input: RequestInfo | URL,
          init?: RequestInit,
        ) => Promise<Response>
      >()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'Your session is invalid or expired. Sign in again.',
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await authenticatedFetch(
      'https://api.example.test/api/settings/options',
    )

    expect(response.status).toBe(200)
    expect(refreshSession).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const retryHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers)
    expect(retryHeaders.get('Authorization')).toBe('Bearer fresh-token')
  })
})
