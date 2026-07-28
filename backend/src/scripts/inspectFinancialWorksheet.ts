import { MicrosoftAuthService } from '../auth/microsoftAuthService.js'
import { readWorkbookConnection } from '../graph/connectionStore.js'

const connection = await readWorkbookConnection()

if (!connection) {
  throw new Error('Workbook connection is not cached')
}

const accessToken = await new MicrosoftAuthService().getAccessToken()
const worksheet = encodeURIComponent('financial ')
const response = await fetch(
  `https://graph.microsoft.com/v1.0/me/drive/items/${connection.driveItemId}/workbook/worksheets/${worksheet}/usedRange(valuesOnly=true)`,
  {
    headers: { Authorization: `Bearer ${accessToken}` },
  },
)

if (!response.ok) {
  throw new Error(
    `Could not inspect financial worksheet; Graph returned ${response.status}`,
  )
}

const body = (await response.json()) as {
  address?: string
  rowIndex?: number
  rowCount?: number
  columnIndex?: number
  columnCount?: number
  values?: unknown[][]
}

console.log(
  JSON.stringify(
    {
      address: body.address,
      rowIndex: body.rowIndex,
      rowCount: body.rowCount,
      columnIndex: body.columnIndex,
      columnCount: body.columnCount,
      firstRows: body.values?.slice(0, 5) ?? [],
    },
    null,
    2,
  ),
)
