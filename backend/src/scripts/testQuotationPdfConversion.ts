import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readWorkbookConnection } from '../graph/connectionStore.js'
import { MicrosoftOneDriveService } from '../graph/oneDriveService.js'

const connection = await readWorkbookConnection()

if (!connection) {
  throw new Error('Workbook connection is not cached')
}

type DiagnosticService = {
  recoverPendingVisibility(): Promise<void>
  convertWorksheetToPdf(
    connectionValue: typeof connection,
    worksheetName: string,
  ): Promise<Buffer>
}

const service = new MicrosoftOneDriveService() as unknown as DiagnosticService
await service.recoverPendingVisibility()
const pdf = await service.convertWorksheetToPdf(connection, 'Quatation')
const outputDirectory = resolve('../tmp/pdfs')
const outputPath = resolve(outputDirectory, 'quotation-visibility-test.pdf')

await mkdir(outputDirectory, { recursive: true })
await writeFile(outputPath, pdf)

console.log(JSON.stringify({ outputPath, bytes: pdf.length }))
