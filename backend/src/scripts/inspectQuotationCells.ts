import { MicrosoftAuthService } from '../auth/microsoftAuthService.js'
import { readWorkbookConnection } from '../graph/connectionStore.js'

const connection = await readWorkbookConnection()

if (!connection) {
  throw new Error('Workbook connection is not cached')
}

const accessToken = await new MicrosoftAuthService().getAccessToken()
const worksheet = encodeURIComponent('Quatation')
const addresses = [
  'H9:H14',
  'B15',
  'B16',
  'C17',
  'B18',
  'A21',
  'A22',
  'A26:A37',
  'B26',
  'F26:H37',
  'H38',
]
const ranges: Record<string, unknown[][] | undefined> = {}

for (const address of addresses) {
  const encodedAddress = encodeURIComponent(address)
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${connection.driveItemId}/workbook/worksheets/${worksheet}/range(address='${encodedAddress}')`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) {
    throw new Error(
      `Could not inspect ${address}; Graph returned ${response.status}`,
    )
  }

  const body = (await response.json()) as { values?: unknown[][] }
  ranges[address] = body.values
}

console.log(JSON.stringify(ranges, null, 2))
