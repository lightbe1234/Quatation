import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const settingsPath = fileURLToPath(
  new URL('../../.data/graph-settings.json', import.meta.url),
)
const pdfSettingsPath = fileURLToPath(
  new URL('../../.data/pdf-workbook-settings.json', import.meta.url),
)

export type WorkbookConnection = {
  driveItemId: string
  name: string
  webUrl: string | null
  connectedAt: string
}

async function readConnection(path: string) {
  try {
    return JSON.parse(
      await readFile(path, 'utf8'),
    ) as WorkbookConnection
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

async function saveConnection(
  path: string,
  connection: WorkbookConnection,
) {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.tmp`
  await writeFile(temporaryPath, JSON.stringify(connection, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  })
  await rename(temporaryPath, path)
}

export function readWorkbookConnection() {
  return readConnection(settingsPath)
}

export function saveWorkbookConnection(connection: WorkbookConnection) {
  return saveConnection(settingsPath, connection)
}

export function readPdfWorkbookConnection() {
  return readConnection(pdfSettingsPath)
}

export function savePdfWorkbookConnection(
  connection: WorkbookConnection,
) {
  return saveConnection(pdfSettingsPath, connection)
}
