import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { MicrosoftAuthService } from '../auth/microsoftAuthService.js'
import { readWorkbookConnection } from '../graph/connectionStore.js'

const connection = await readWorkbookConnection()

if (!connection) {
  throw new Error('Workbook connection is not cached')
}

const accessToken = await new MicrosoftAuthService().getAccessToken()
const response = await fetch(
  `https://graph.microsoft.com/v1.0/me/drive/items/${connection.driveItemId}/content?format=pdf`,
  {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: 'follow',
  },
)

if (!response.ok) {
  throw new Error(`PDF conversion failed with status ${response.status}`)
}

const outputDirectory = resolve('../tmp/pdfs')
const outputPath = resolve(outputDirectory, 'current-workbook.pdf')
const content = Buffer.from(await response.arrayBuffer())

await mkdir(outputDirectory, { recursive: true })
await writeFile(outputPath, content)

console.log(
  JSON.stringify({
    outputPath,
    contentType: response.headers.get('content-type'),
    bytes: content.length,
  }),
)
