import { describe, expect, it, vi } from 'vitest'
import { refreshPdfTemplateFlow } from './pdfTemplateRefresh.js'

const mainWorkbook = {
  driveItemId: 'main-workbook-id',
  name: 'Web app.xlsx',
  webUrl: 'https://example.test/main',
  connectedAt: '2026-07-30T00:00:00.000Z',
}

const pdfWorkbook = {
  driveItemId: 'pdf-workbook-id',
  name: 'Web app PDF Export.xlsx',
  webUrl: 'https://example.test/pdf',
  connectedAt: '2026-07-30T00:00:00.000Z',
}

function createDependencies(
  existingPdf: typeof pdfWorkbook | undefined,
) {
  return {
    cacheMainWorkbook: vi.fn(async () => undefined),
    cachePdfWorkbook: vi.fn(async () => undefined),
    clearCachedPdfWorkbook: vi.fn(async () => undefined),
    createPdfWorkbook: vi.fn(async () => pdfWorkbook),
    findMainWorkbook: vi.fn(async () => mainWorkbook),
    findPdfWorkbook: vi.fn(async () => existingPdf),
    now: vi.fn(() => new Date('2026-07-30T12:00:00.000Z')),
    preparePdfWorkbook: vi.fn(async () => undefined),
    replacePdfWorkbookContents: vi.fn(async () => undefined),
  }
}

describe('PDF template refresh flow', () => {
  it('finds the current main workbook, clears cache, and refreshes the existing PDF workbook', async () => {
    const dependencies = createDependencies(pdfWorkbook)

    const result = await refreshPdfTemplateFlow(dependencies)

    expect(dependencies.findMainWorkbook).toHaveBeenCalledOnce()
    expect(dependencies.cacheMainWorkbook).toHaveBeenCalledWith(mainWorkbook)
    expect(dependencies.clearCachedPdfWorkbook).toHaveBeenCalledOnce()
    expect(dependencies.findPdfWorkbook).toHaveBeenCalledOnce()
    expect(dependencies.replacePdfWorkbookContents).toHaveBeenCalledWith(
      mainWorkbook,
      pdfWorkbook,
    )
    expect(dependencies.preparePdfWorkbook).toHaveBeenCalledWith(pdfWorkbook)
    expect(dependencies.cachePdfWorkbook).toHaveBeenCalledWith(pdfWorkbook)
    expect(result).toEqual({
      name: 'Web app PDF Export.xlsx',
      refreshedAt: '2026-07-30T12:00:00.000Z',
    })
  })

  it('creates a fresh PDF workbook when no export workbook exists', async () => {
    const dependencies = createDependencies(undefined)

    await refreshPdfTemplateFlow(dependencies)

    expect(dependencies.createPdfWorkbook).toHaveBeenCalledWith(mainWorkbook)
    expect(dependencies.replacePdfWorkbookContents).not.toHaveBeenCalled()
    expect(dependencies.preparePdfWorkbook).toHaveBeenCalledWith(pdfWorkbook)
  })
})
