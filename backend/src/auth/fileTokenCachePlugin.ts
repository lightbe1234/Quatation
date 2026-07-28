import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { ICachePlugin, TokenCacheContext } from '@azure/msal-node'

export class FileTokenCachePlugin implements ICachePlugin {
  constructor(private readonly cachePath: string) {}

  async beforeCacheAccess(context: TokenCacheContext) {
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

    await mkdir(dirname(this.cachePath), { recursive: true })
    const temporaryPath = `${this.cachePath}.tmp`
    await writeFile(temporaryPath, context.tokenCache.serialize(), {
      encoding: 'utf8',
      mode: 0o600,
    })
    await rename(temporaryPath, this.cachePath)
  }
}
