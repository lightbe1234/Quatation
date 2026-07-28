import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { ICachePlugin, TokenCacheContext } from '@azure/msal-node'

export class FileTokenCachePlugin implements ICachePlugin {
  constructor(
    private readonly cachePath: string,
    private readonly envCacheName = 'MICROSOFT_TOKEN_CACHE_JSON',
  ) {}

  async beforeCacheAccess(context: TokenCacheContext) {
    const envCache = process.env[this.envCacheName]

    if (envCache) {
      context.tokenCache.deserialize(envCache)
      return
    }

    try {
      const cache = await readFile(this.cachePath, 'utf8')
      context.tokenCache.deserialize(cache)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  async afterCacheAccess(context: TokenCacheContext) {
    if (!context.cacheHasChanged) {
      return
    }

    try {
      await mkdir(dirname(this.cachePath), { recursive: true })
      const temporaryPath = `${this.cachePath}.tmp`
      await writeFile(temporaryPath, context.tokenCache.serialize(), {
        encoding: 'utf8',
        mode: 0o600,
      })
      await rename(temporaryPath, this.cachePath)
    } catch (error) {
      if (process.env[this.envCacheName]) {
        return
      }

      throw error
    }
  }
}
