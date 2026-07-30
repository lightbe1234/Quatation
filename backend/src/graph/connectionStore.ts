import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
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

function readEnvConnection(name: string) {
  const value = process.env[name]

  if (!value) {
    return undefined
  }

  return JSON.parse(value) as WorkbookConnection
}

async function readConnection(path: string, envName: string) {
  const envConnection = readEnvConnection(envName)

  if (envConnection) {
    return envConnection
  }

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
  try {
    await mkdir(dirname(path), { recursive: true })
    const temporaryPath = `${path}.tmp`
    await writeFile(temporaryPath, JSON.stringify(connection, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    })
    await rename(temporaryPath, path)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (
      process.env.VERCEL &&
      (code === 'EROFS' || code === 'EPERM' || code === 'EACCES')
    ) {
      return
    }

    throw error
  }
}

export function readWorkbookConnection() {
  return readConnection(
    settingsPath,
    'ONEDRIVE_WORKBOOK_CONNECTION_JSON',
  )
}

export function saveWorkbookConnection(connection: WorkbookConnection) {
  return saveConnection(settingsPath, connection)
}

export function readPdfWorkbookConnection() {
  return readConnection(
    pdfSettingsPath,
    'ONEDRIVE_PDF_WORKBOOK_CONNECTION_JSON',
  )
}

export function savePdfWorkbookConnection(
  connection: WorkbookConnection,
) {
  return saveConnection(pdfSettingsPath, connection)
}

export async function clearPdfWorkbookConnection() {
  try {
    await rm(pdfSettingsPath, { force: true })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (
      code === 'ENOENT' ||
      (process.env.VERCEL &&
        (code === 'EROFS' || code === 'EPERM' || code === 'EACCES'))
    ) {
      return
    }

    throw error
  }
}
