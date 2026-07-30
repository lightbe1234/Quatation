import {
  InteractionRequiredAuthError,
  type ConfidentialClientApplication,
} from '@azure/msal-node'
import { describe, expect, it, vi } from 'vitest'
import { MicrosoftAuthService } from './microsoftAuthService.js'

function createClient(
  acquireTokenSilent: ConfidentialClientApplication['acquireTokenSilent'],
) {
  return {
    acquireTokenSilent,
    getTokenCache: () => ({
      getAllAccounts: vi.fn(async () => [
        {
          homeAccountId: 'home-account',
          environment: 'login.microsoftonline.com',
          tenantId: 'tenant',
          username: 'admin@example.com',
          localAccountId: 'local-account',
          name: 'Admin',
        },
      ]),
    }),
  } as unknown as ConfidentialClientApplication
}

describe('MicrosoftAuthService', () => {
  it('returns a clear reconnect message when silent token renewal expires', async () => {
    const client = createClient(
      vi.fn(async () => {
        throw new InteractionRequiredAuthError(
          'interaction_required',
          'correlation-id',
          'The refresh token has expired.',
        )
      }),
    )
    const service = new MicrosoftAuthService(client)

    await expect(service.getAccessToken()).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 401,
      message: 'OneDrive authorization needs to be renewed',
    })
  })
})
