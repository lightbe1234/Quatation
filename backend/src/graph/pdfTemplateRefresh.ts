import { AppError } from '../errors/appError.js'
import type { WorkbookConnection } from './connectionStore.js'

export const mainWorkbookName = 'Web app.xlsx'
export const pdfWorkbookName = 'Web app PDF Export.xlsx'

type RefreshPdfTemplateDependencies = {
  cacheMainWorkbook(
    connection: WorkbookConnection,
  ): Promise<void>
  cachePdfWorkbook(
    connection: WorkbookConnection,
  ): Promise<void>
  clearCachedPdfWorkbook(): Promise<void>
  createPdfWorkbook(
    mainConnection: WorkbookConnection,
  ): Promise<WorkbookConnection>
  findMainWorkbook(): Promise<WorkbookConnection | undefined>
  findPdfWorkbook(): Promise<WorkbookConnection | undefined>
  now(): Date
  preparePdfWorkbook(
    connection: WorkbookConnection,
  ): Promise<void>
  replacePdfWorkbookContents(
    mainConnection: WorkbookConnection,
    pdfConnection: WorkbookConnection,
  ): Promise<void>
}

export async function refreshPdfTemplateFlow(
  dependencies: RefreshPdfTemplateDependencies,
) {
  const mainConnection = await dependencies.findMainWorkbook()

  if (!mainConnection || mainConnection.name !== mainWorkbookName) {
    throw new AppError(
      `Could not find ${mainWorkbookName} in the connected OneDrive`,
      404,
    )
  }

  await dependencies.cacheMainWorkbook(mainConnection)
  await dependencies.clearCachedPdfWorkbook()

  const existingPdfConnection = await dependencies.findPdfWorkbook()
  const pdfConnection =
    existingPdfConnection ??
    await dependencies.createPdfWorkbook(mainConnection)

  if (pdfConnection.name !== pdfWorkbookName) {
    throw new AppError(
      `Could not prepare ${pdfWorkbookName}`,
      502,
    )
  }

  if (existingPdfConnection) {
    await dependencies.replacePdfWorkbookContents(
      mainConnection,
      pdfConnection,
    )
  }

  await dependencies.preparePdfWorkbook(pdfConnection)
  await dependencies.cachePdfWorkbook(pdfConnection)

  return {
    name: pdfWorkbookName,
    refreshedAt: dependencies.now().toISOString(),
  }
}
