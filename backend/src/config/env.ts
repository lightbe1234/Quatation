import 'dotenv/config'

const parsedPort = Number.parseInt(process.env.PORT ?? '3000', 10)

export const env = {
  port: Number.isNaN(parsedPort) ? 3000 : parsedPort,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  microsoftDirectoryTenantId: process.env.MICROSOFT_DIRECTORY_TENANT_ID,
  microsoftAuthorityTenant:
    process.env.MICROSOFT_AUTHORITY_TENANT ?? 'common',
  microsoftRedirectUri:
    process.env.MICROSOFT_REDIRECT_URI ??
    'http://localhost:3000/api/auth/callback',
}

export function requireMicrosoftEnv() {
  if (
    !env.microsoftClientId ||
    !env.microsoftClientSecret ||
    !env.microsoftDirectoryTenantId
  ) {
    throw new Error(
      'Microsoft client, secret, and directory tenant values must be configured',
    )
  }

  return {
    clientId: env.microsoftClientId,
    clientSecret: env.microsoftClientSecret,
    directoryTenantId: env.microsoftDirectoryTenantId,
    authorityTenant: env.microsoftAuthorityTenant,
    redirectUri: env.microsoftRedirectUri,
  }
}

export function requireSupabaseEnv() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured',
    )
  }

  return {
    url: env.supabaseUrl,
    serviceRoleKey: env.supabaseServiceRoleKey,
  }
}
