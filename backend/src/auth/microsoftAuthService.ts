import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  ConfidentialClientApplication,
  CryptoProvider,
  InteractionRequiredAuthError,
} from '@azure/msal-node'
import { requireMicrosoftEnv } from '../config/env.js'
import { AppError } from '../errors/appError.js'
import { FileTokenCachePlugin } from './fileTokenCachePlugin.js'

const authorizationScopes = [
  'openid',
  'profile',
  'offline_access',
  'Files.ReadWrite',
]
const graphScopes = ['Files.ReadWrite']
const flowLifetimeMs = 10 * 60 * 1000
const cachePath = fileURLToPath(
  new URL('../../.data/msal-token-cache.json', import.meta.url),
)

type PendingFlow = {
  codeVerifier: string
  expiresAt: number
}

export class MicrosoftAuthService {
  private client?: ConfidentialClientApplication
  private readonly cryptoProvider = new CryptoProvider()
  private readonly pendingFlows = new Map<string, PendingFlow>()

  private getClient() {
    if (!this.client) {
      const config = requireMicrosoftEnv()

      this.client = new ConfidentialClientApplication({
        auth: {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          authority: `https://login.microsoftonline.com/${config.authorityTenant}`,
        },
        cache: {
          cachePlugin: new FileTokenCachePlugin(cachePath),
        },
      })
    }

    return this.client
  }

  async createAuthorizationUrl() {
    this.removeExpiredFlows()
    const state = randomUUID()
    const { verifier, challenge } =
      await this.cryptoProvider.generatePkceCodes()

    this.pendingFlows.set(state, {
      codeVerifier: verifier,
      expiresAt: Date.now() + flowLifetimeMs,
    })

    return this.getClient().getAuthCodeUrl({
      scopes: authorizationScopes,
      redirectUri: requireMicrosoftEnv().redirectUri,
      responseMode: 'query',
      state,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      prompt: 'select_account',
    })
  }

  async completeAuthorization(code: string, state: string) {
    this.removeExpiredFlows()
    const pendingFlow = this.pendingFlows.get(state)

    if (!pendingFlow) {
      throw new AppError(
        'The Microsoft sign-in request expired or has an invalid state',
        400,
      )
    }

    this.pendingFlows.delete(state)
    const result = await this.getClient().acquireTokenByCode({
      code,
      scopes: authorizationScopes,
      redirectUri: requireMicrosoftEnv().redirectUri,
      codeVerifier: pendingFlow.codeVerifier,
    })

    if (!result?.account) {
      throw new AppError('Microsoft sign-in did not return an account', 502)
    }
  }

  async isConnected() {
    const accounts = await this.getClient().getTokenCache().getAllAccounts()
    return accounts.length > 0
  }

  async getAccessToken() {
    const accounts = await this.getClient().getTokenCache().getAllAccounts()
    const account = accounts[0]

    if (!account) {
      throw new AppError('OneDrive is not connected', 401)
    }

    try {
      const result = await this.getClient().acquireTokenSilent({
        account,
        scopes: graphScopes,
      })

      if (!result?.accessToken) {
        throw new AppError('Microsoft did not return an access token', 502)
      }

      return result.accessToken
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        throw new AppError(
          'OneDrive authorization needs to be renewed',
          401,
        )
      }

      throw error
    }
  }

  private removeExpiredFlows() {
    const now = Date.now()

    for (const [state, flow] of this.pendingFlows) {
      if (flow.expiresAt <= now) {
        this.pendingFlows.delete(state)
      }
    }
  }
}
