import { MicrosoftAuthService } from '../auth/microsoftAuthService.js'
import { readWorkbookConnection } from '../graph/connectionStore.js'

type DriveItem = {
  name: string
  parentReference?: {
    path?: string
  }
}

type DriveItemsResponse = {
  value?: DriveItem[]
}

async function graphRequest(path: string, accessToken: string) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = (await response.json()) as DriveItemsResponse

  return {
    status: response.status,
    items: (body.value ?? []).map((item) => ({
      name: item.name,
      path: item.parentReference?.path ?? null,
    })),
  }
}

const authService = new MicrosoftAuthService()
const accessToken = await authService.getAccessToken()
const root = await graphRequest(
  '/me/drive/root/children?$select=name,file,folder,parentReference',
  accessToken,
)
const webSearch = await graphRequest(
  "/me/drive/root/search(q='Web')?$select=name,file,folder,parentReference",
  accessToken,
)
const connection = await readWorkbookConnection()

if (!connection) {
  throw new Error('Workbook connection is not cached')
}

const worksheetsResponse = await fetch(
  `https://graph.microsoft.com/v1.0/me/drive/items/${connection.driveItemId}/workbook/worksheets?$select=name,position,visibility`,
  { headers: { Authorization: `Bearer ${accessToken}` } },
)
const worksheets = (await worksheetsResponse.json()) as {
  value?: Array<{ name: string; position: number; visibility: string }>
}
const namesResponse = await fetch(
  `https://graph.microsoft.com/v1.0/me/drive/items/${connection.driveItemId}/workbook/names?$select=name,formula,type,visible`,
  { headers: { Authorization: `Bearer ${accessToken}` } },
)
const names = (await namesResponse.json()) as {
  value?: Array<{
    name: string
    formula: string
    type: string
    visible: boolean
  }>
}

console.log(
  JSON.stringify(
    {
      root,
      webSearch,
      worksheets: {
        status: worksheetsResponse.status,
        items: worksheets.value ?? [],
      },
      workbookNames: {
        status: namesResponse.status,
        items: names.value ?? [],
      },
    },
    null,
    2,
  ),
)
