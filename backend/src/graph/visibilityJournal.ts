import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const journalPath = fileURLToPath(
  new URL('../../.data/workbook-visibility-journal.json', import.meta.url),
)

export type WorksheetVisibility = {
  id: string
  name: string
  visibility: string
}

export type VisibilityJournal = {
  driveItemId: string
  worksheets: WorksheetVisibility[]
}

export async function readVisibilityJournal() {
  try {
    return JSON.parse(await readFile(journalPath, 'utf8')) as VisibilityJournal
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

export async function saveVisibilityJournal(journal: VisibilityJournal) {
  await mkdir(dirname(journalPath), { recursive: true })
  const temporaryPath = `${journalPath}.tmp`
  await writeFile(temporaryPath, JSON.stringify(journal, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  })
  await rename(temporaryPath, journalPath)
}

export async function clearVisibilityJournal() {
  await rm(journalPath, { force: true })
}
