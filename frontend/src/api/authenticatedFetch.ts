import { getSupabaseBrowserClient } from '../lib/supabaseClient'

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session?.access_token) {
    throw new Error('Your session has expired. Sign in again.')
  }

  function requestWithToken(accessToken: string) {
    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)

    return fetch(input, {
      ...init,
      headers,
    })
  }

  const response = await requestWithToken(data.session.access_token)

  if (response.status !== 401) {
    return response
  }

  const {
    data: refreshedData,
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !refreshedData.session?.access_token) {
    await supabase.auth.signOut({ scope: 'local' })
    throw new Error('Your session has expired. Sign in again.')
  }

  return requestWithToken(refreshedData.session.access_token)
}
