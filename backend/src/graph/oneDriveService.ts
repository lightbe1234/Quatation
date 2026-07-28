import { AppError } from '../errors/appError.js'
import { MicrosoftAuthService } from '../auth/microsoftAuthService.js'
import type { SavedQuotation } from '../types/quotation.js'
import type { Store } from '../types/store.js'
import {
  readPdfWorkbookConnection,
  readWorkbookConnection,
  savePdfWorkbookConnection,
  saveWorkbookConnection,
  type WorkbookConnection,
} from './connectionStore.js'
import {
  GraphClient,
  type GraphBatchRequest,
} from './graphClient.js'
import {
  buildQuotationWrites,
  buildSummaryWrite,
  quotationWorksheet,
  summaryTemplateAddress,
  summaryWorksheet,
} from './quotationWorkbook.js'
import {
  buildFinancialRow,
  financialWorksheet,
} from './financialWorkbook.js'
import {
  clearVisibilityJournal,
  readVisibilityJournal,
  saveVisibilityJournal,
  type WorksheetVisibility,
} from './visibilityJournal.js'
import {
  waitForExpectedRange,
  rangeValuesMatch,
} from './graphWriteVerification.js'
import {
  buildQuotationItemRowFormatting,
  buildQuotationTableLayout,
  quotationBorderSides,
} from './quotationTableFormatting.js'
import {
  buildSummaryGrid,
  type SummaryGrid,
} from './summaryGrid.js'
import {
  buildRecordGrid,
  financialRecordConfig,
  normalizeRecordRow,
  parseRecordValues,
  rowHasContent,
  type RecordCell,
  type RecordKind,
  type WorkbookRecordGrid,
} from './recordGrid.js'

const workbookName = 'Web app.xlsx'
const pdfWorkbookName = 'Web app PDF Export.xlsx'

type SearchResponse = {
  value: Array<{
    id: string
    name: string
    webUrl?: string
    file?: unknown
    lastModifiedDateTime?: string
  }>
}

type DriveItemInfo = {
  id: string
  name: string
  webUrl?: string
  parentReference?: {
    driveId?: string
    id?: string
  }
}

type CopyMonitorStatus = {
  status?: 'notStarted' | 'inProgress' | 'completed' | 'failed'
  error?: {
    code?: string
    message?: string
  }
}

type UsedRange = {
  address: string
  columnIndex: number
  rowIndex: number
  columnCount: number
  rowCount: number
  values?: unknown[][]
}

type RangeValue = {
  values?: unknown[][]
}

type WorksheetsResponse = {
  value: WorksheetVisibility[]
}

type WorkbookSession = {
  id: string
}

export type GeneratePdfResult = {
  pdf: Buffer
  summaryCreated: boolean
}

export type TransferFinancialResult = {
  financialCreated: boolean
}

export type TestCellCandidate = {
  worksheet: string
  address: string
  usedRange: string
}

export type OneDriveStatus = {
  connected: boolean
  workbook?: {
    name: string
    connectedAt: string
  }
}

export interface OneDriveService {
  createAuthorizationUrl(): Promise<string>
  completeAuthorization(code: string, state: string): Promise<void>
  getStatus(): Promise<OneDriveStatus>
  inspectSafeTestCell(): Promise<TestCellCandidate>
  runTestCell(
    worksheet: string,
    address: string,
  ): Promise<{ address: string; verified: true; restored: true }>
  getSummaryGrid(): Promise<SummaryGrid>
  getRecordGrids(): Promise<{ financial: WorkbookRecordGrid }>
  updateRecordRow(
    kind: RecordKind,
    rowNumber: number,
    values: RecordCell[],
  ): Promise<WorkbookRecordGrid>
  deleteRecordRow(
    kind: RecordKind,
    rowNumber: number,
  ): Promise<WorkbookRecordGrid>
  generateQuotationPdf(
    quotation: SavedQuotation,
    store: Store,
  ): Promise<GeneratePdfResult>
  transferQuotationToFinancial(
    quotation: SavedQuotation,
    store: Store,
  ): Promise<TransferFinancialResult>
}

function columnName(index: number) {
  let value = index + 1
  let result = ''

  while (value > 0) {
    const remainder = (value - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    value = Math.floor((value - 1) / 26)
  }

  return result
}

function isBlankRange(range: RangeValue) {
  const value = range.values?.[0]?.[0]
  return value === null || value === undefined || value === ''
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export class MicrosoftOneDriveService implements OneDriveService {
  private readonly authService = new MicrosoftAuthService()
  private readonly graphClient = new GraphClient(this.authService)

  createAuthorizationUrl() {
    return this.authService.createAuthorizationUrl()
  }

  async completeAuthorization(code: string, state: string) {
    await this.authService.completeAuthorization(code, state)
    await this.discoverWorkbook()
  }

  async getStatus(): Promise<OneDriveStatus> {
    const connected = await this.authService.isConnected()
    let workbook = connected ? await readWorkbookConnection() : undefined

    if (connected && !workbook) {
      await this.discoverWorkbook()
      workbook = await readWorkbookConnection()
    }

    return {
      connected: connected && Boolean(workbook),
      workbook: workbook
        ? {
            name: workbook.name,
            connectedAt: workbook.connectedAt,
          }
        : undefined,
    }
  }

  async inspectSafeTestCell() {
    const connection = await this.requireConnection()
    const worksheet = encodeURIComponent(quotationWorksheet)
    const usedRange = await this.graphClient.request<UsedRange>(
      `/me/drive/items/${connection.driveItemId}/workbook/worksheets/${worksheet}/usedRange(valuesOnly=true)`,
    )

    const nextColumnIndex = usedRange.columnIndex + usedRange.columnCount + 1
    let address: string

    if (nextColumnIndex < 16_384) {
      address = `${columnName(nextColumnIndex)}1`
    } else {
      address = `A${usedRange.rowIndex + usedRange.rowCount + 2}`
    }

    const currentValue = await this.readCell(connection, address)

    if (!isBlankRange(currentValue)) {
      throw new AppError(
        `The inspected test cell ${address} is not blank`,
        409,
      )
    }

    return {
      worksheet: quotationWorksheet,
      address,
      usedRange: usedRange.address,
    }
  }

  async runTestCell(worksheet: string, address: string) {
    const candidate = await this.inspectSafeTestCell()

    if (
      worksheet !== candidate.worksheet ||
      address.toUpperCase() !== candidate.address
    ) {
      throw new AppError(
        'The approved test cell no longer matches the safe blank candidate',
        409,
      )
    }

    const connection = await this.requireConnection()
    const marker = `GRAPH_TEST_${Date.now()}`
    let wroteMarker = false

    try {
      await this.graphClient.request<RangeValue>(
        this.cellPath(connection, address),
        {
          method: 'PATCH',
          body: JSON.stringify({ values: [[marker]] }),
        },
      )
      wroteMarker = true

      const writtenValue = await this.readCell(connection, address)

      if (writtenValue.values?.[0]?.[0] !== marker) {
        throw new AppError('The Graph test-cell value was not verified', 502)
      }
    } finally {
      if (wroteMarker) {
        await this.graphClient.request<void>(
          `${this.cellPath(connection, address)}/clear`,
          {
            method: 'POST',
            body: JSON.stringify({ applyTo: 'Contents' }),
          },
        )
      }
    }

    const restoredValue = await this.readCell(connection, address)

    if (!isBlankRange(restoredValue)) {
      throw new AppError('The Graph test cell was not restored to blank', 502)
    }

    return {
      address: `${worksheet}!${address}`,
      verified: true as const,
      restored: true as const,
    }
  }

  async generateQuotationPdf(
    quotation: SavedQuotation,
    store: Store,
  ): Promise<GeneratePdfResult> {
    const startedAt = Date.now()
    const connection = await this.requireConnection()
    const pdfConnection = await this.requirePdfWorkbookConnection(
      connection,
    )
    await this.recoverPendingVisibility()
    const writeStartedAt = Date.now()
    const mainWritePromise = this.withWorkbookSession(
      connection,
      async (sessionId) => {
        await this.writeQuotation(
          connection,
          quotation,
          store,
          sessionId,
          { formatTable: false },
        )
        return this.writeSummary(connection, quotation, store, sessionId)
      },
    )
    const pdfWritePromise = this.withWorkbookSession(pdfConnection, (sessionId) =>
      this.writeQuotation(
        pdfConnection,
        quotation,
        store,
        sessionId,
        { formatTable: true },
      ),
    )
    await pdfWritePromise
    const pdfWorkbookWrittenAt = Date.now()
    const pdf = await this.convertWorkbookToPdf(pdfConnection)
    const pdfConvertedAt = Date.now()
    const summaryCreated = await mainWritePromise
    const mainWorkbookWrittenAt = Date.now()
    const completedAt = Date.now()

    console.info('Quotation PDF timings', {
      setupMs: writeStartedAt - startedAt,
      pdfWorkbookWriteMs: pdfWorkbookWrittenAt - writeStartedAt,
      conversionMs: pdfConvertedAt - pdfWorkbookWrittenAt,
      mainWorkbookAndSummaryWriteMs:
        mainWorkbookWrittenAt - writeStartedAt,
      postConversionWaitForSummaryMs: completedAt - pdfConvertedAt,
      totalMs: completedAt - startedAt,
    })

    return { pdf, summaryCreated }
  }

  async getSummaryGrid() {
    const connection = await this.requireConnection()
    const range = await this.graphClient.request<RangeValue>(
      this.rangePath(
        connection,
        summaryWorksheet,
        summaryTemplateAddress,
      ),
    )

    return buildSummaryGrid(range.values, summaryTemplateAddress)
  }

  async getRecordGrids() {
    return { financial: await this.readRecordGrid() }
  }

  async updateRecordRow(
    kind: RecordKind,
    rowNumber: number,
    values: RecordCell[],
  ) {
    const config = financialRecordConfig
    const parsedValues = parseRecordValues(config, values)
    const connection = await this.requireConnection()
    const rowAddress = `A${rowNumber}:${config.endColumn}${rowNumber}`

    await this.withWorkbookSession(connection, async (sessionId) => {
      const existingRow = await this.readRecordRow(
        connection,
        config.worksheet,
        rowAddress,
        config.columnCount,
        sessionId,
      )

      if (!rowHasContent(existingRow)) {
        throw new AppError(
          `No existing ${kind} record was found at row ${rowNumber}`,
          404,
        )
      }

      await this.graphClient.request<RangeValue>(
        this.rangePath(connection, config.worksheet, rowAddress),
        {
          method: 'PATCH',
          headers: this.sessionHeaders(sessionId),
          body: JSON.stringify({ values: [parsedValues] }),
        },
      )

      const verified = await waitForExpectedRange(
        async () =>
          (
            await this.graphClient.request<RangeValue>(
              this.rangePath(connection, config.worksheet, rowAddress),
              { headers: this.sessionHeaders(sessionId) },
            )
          ).values,
        [parsedValues],
      )

      if (!verified) {
        throw new AppError(
          `Excel did not verify the updated ${kind} row`,
          502,
        )
      }
    })

    return this.readRecordGrid()
  }

  async deleteRecordRow(kind: RecordKind, rowNumber: number) {
    const config = financialRecordConfig
    const connection = await this.requireConnection()
    const rowAddress = `A${rowNumber}:${config.endColumn}${rowNumber}`
    const blankValues = [Array.from({ length: config.columnCount }, () => '')]

    await this.withWorkbookSession(connection, async (sessionId) => {
      const existingRow = await this.readRecordRow(
        connection,
        config.worksheet,
        rowAddress,
        config.columnCount,
        sessionId,
      )

      if (!rowHasContent(existingRow)) {
        throw new AppError(
          `No existing ${kind} record was found at row ${rowNumber}`,
          404,
        )
      }

      await this.graphClient.request<void>(
        `${this.rangePath(connection, config.worksheet, rowAddress)}/clear`,
        {
          method: 'POST',
          headers: this.sessionHeaders(sessionId),
          body: JSON.stringify({ applyTo: 'Contents' }),
        },
      )

      const verified = await waitForExpectedRange(
        async () =>
          (
            await this.graphClient.request<RangeValue>(
              this.rangePath(connection, config.worksheet, rowAddress),
              { headers: this.sessionHeaders(sessionId) },
            )
          ).values,
        blankValues,
      )

      if (!verified) {
        throw new AppError(
          `Excel did not verify the deleted ${kind} row`,
          502,
        )
      }
    })

    return this.readRecordGrid()
  }

  async transferQuotationToFinancial(
    quotation: SavedQuotation,
    store: Store,
  ): Promise<TransferFinancialResult> {
    const connection = await this.requireConnection()
    const financialCreated = await this.withWorkbookSession(
      connection,
      (sessionId) =>
        this.appendFinancial(
          connection,
          quotation,
          store,
          sessionId,
        ),
    )

    return { financialCreated }
  }

  private async discoverWorkbook() {
    const match = await this.findWorkbookByName(workbookName)

    if (!match) {
      throw new AppError(
        `Could not find ${workbookName} in the connected OneDrive`,
        404,
      )
    }

    await saveWorkbookConnection({
      driveItemId: match.id,
      name: match.name,
      webUrl: match.webUrl ?? null,
      connectedAt: new Date().toISOString(),
    })
  }

  private async findWorkbookByName(name: string) {
    const searchTerm = encodeURIComponent(name)
    const searchResult = await this.graphClient.request<SearchResponse>(
      `/me/drive/root/search(q='${searchTerm}')?$select=id,name,webUrl,file,lastModifiedDateTime`,
    )
    let exactMatches = searchResult.value.filter(
      (item) =>
        item.name.toLowerCase() === name.toLowerCase() && item.file,
    )

    // Personal OneDrive search indexing can lag behind root contents.
    if (exactMatches.length === 0) {
      const rootResult = await this.graphClient.request<SearchResponse>(
        '/me/drive/root/children?$select=id,name,webUrl,file,lastModifiedDateTime',
      )
      exactMatches = rootResult.value.filter(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() && item.file,
      )
    }

    if (exactMatches.length === 0) {
      return undefined
    }

    if (exactMatches.length > 1 && name === workbookName) {
      throw new AppError(
        `Found multiple files named ${name}; keep one exact copy before reconnecting`,
        409,
      )
    }

    return exactMatches.sort((first, second) =>
      String(second.lastModifiedDateTime ?? '').localeCompare(
        String(first.lastModifiedDateTime ?? ''),
      ),
    )[0]
  }

  private async requirePdfWorkbookConnection(
    mainConnection: WorkbookConnection,
  ) {
    const cached = await readPdfWorkbookConnection()

    if (cached && await this.workbookExists(cached.driveItemId)) {
      return cached
    }

    const existing = await this.findWorkbookByName(pdfWorkbookName)
    if (existing) {
      const connection = {
        driveItemId: existing.id,
        name: existing.name,
        webUrl: existing.webUrl ?? null,
        connectedAt: new Date().toISOString(),
      }
      await this.preparePdfWorkbook(connection)
      await savePdfWorkbookConnection(connection)
      return connection
    }

    const connection = await this.createPdfWorkbook(mainConnection)
    await this.preparePdfWorkbook(connection)
    await savePdfWorkbookConnection(connection)
    return connection
  }

  private async workbookExists(driveItemId: string) {
    try {
      await this.graphClient.request<DriveItemInfo>(
        `/me/drive/items/${driveItemId}?$select=id,name`,
      )
      return true
    } catch (error) {
      if (
        error instanceof AppError &&
        error.message.includes('status 404')
      ) {
        return false
      }

      throw error
    }
  }

  private async createPdfWorkbook(
    mainConnection: WorkbookConnection,
  ): Promise<WorkbookConnection> {
    const source = await this.graphClient.request<DriveItemInfo>(
      `/me/drive/items/${mainConnection.driveItemId}?$select=id,name,webUrl,parentReference`,
    )
    const body: {
      name: string
      parentReference?: { driveId?: string; id?: string }
    } = { name: pdfWorkbookName }

    if (
      source.parentReference?.driveId &&
      source.parentReference.id
    ) {
      body.parentReference = {
        driveId: source.parentReference.driveId,
        id: source.parentReference.id,
      }
    }

    const response = await this.graphClient.requestResponse(
      `/me/drive/items/${mainConnection.driveItemId}/copy`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )
    const monitorUrl = response.headers.get('Location')

    if (!monitorUrl) {
      throw new AppError(
        'OneDrive did not return a monitor URL for the PDF workbook copy',
        502,
      )
    }

    await this.waitForCopyCompletion(monitorUrl)
    const copied = await this.waitForWorkbookByName(pdfWorkbookName)

    return {
      driveItemId: copied.id,
      name: copied.name,
      webUrl: copied.webUrl ?? null,
      connectedAt: new Date().toISOString(),
    }
  }

  private async waitForCopyCompletion(monitorUrl: string) {
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      const response = await fetch(monitorUrl)
      const status = (await response.json().catch(() => ({}))) as
        CopyMonitorStatus

      if (status.status === 'completed') {
        return
      }

      if (!response.ok) {
        throw new AppError(
          status.error?.message ??
            `OneDrive copy monitor failed with status ${response.status}`,
          502,
        )
      }

      if (status.status === 'failed') {
        throw new AppError(
          status.error?.message ?? 'OneDrive PDF workbook copy failed',
          502,
        )
      }

      await delay(Math.min(500 * attempt, 3_000))
    }

    throw new AppError('Timed out creating the PDF-only workbook', 502)
  }

  private async waitForWorkbookByName(name: string) {
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      const match = await this.findWorkbookByName(name)

      if (match) {
        return match
      }

      await delay(Math.min(500 * attempt, 3_000))
    }

    throw new AppError(
      `Could not find ${name} after OneDrive copy completed`,
      502,
    )
  }

  private async preparePdfWorkbook(connection: WorkbookConnection) {
    await this.withWorkbookSession(connection, async (sessionId) => {
      const worksheets = await this.listWorksheets(
        connection.driveItemId,
        sessionId,
      )
      const quotationSheet = worksheets.find(
        (worksheet) => worksheet.name === quotationWorksheet,
      )

      if (!quotationSheet) {
        throw new AppError(
          `The PDF workbook is missing worksheet ${quotationWorksheet}`,
          502,
        )
      }

      await Promise.all(
        worksheets
          .filter((worksheet) => worksheet.id !== quotationSheet.id)
          .map((worksheet) =>
            this.graphClient.request<void>(
              `/me/drive/items/${connection.driveItemId}/workbook/worksheets/${encodeURIComponent(worksheet.id)}`,
              {
                method: 'DELETE',
                headers: this.sessionHeaders(sessionId),
              },
            ),
          ),
      )

      if (quotationSheet.visibility !== 'Visible') {
        await this.setWorksheetVisibility(
          connection.driveItemId,
          quotationSheet.id,
          'Visible',
          sessionId,
        )
      }
    })
  }

  private async requireConnection(): Promise<WorkbookConnection> {
    const connection = await readWorkbookConnection()

    if (!connection || !(await this.authService.isConnected())) {
      throw new AppError('OneDrive is not connected', 401)
    }

    return connection
  }

  private cellPath(connection: WorkbookConnection, address: string) {
    return this.rangePath(connection, quotationWorksheet, address)
  }

  private readCell(connection: WorkbookConnection, address: string) {
    return this.graphClient.request<RangeValue>(
      this.cellPath(connection, address),
    )
  }

  private rangePath(
    connection: WorkbookConnection,
    worksheetName: string,
    address: string,
  ) {
    const worksheet = encodeURIComponent(worksheetName)
    const encodedAddress = encodeURIComponent(address)
    return `/me/drive/items/${connection.driveItemId}/workbook/worksheets/${worksheet}/range(address='${encodedAddress}')`
  }

  private async writeQuotation(
    connection: WorkbookConnection,
    quotation: SavedQuotation,
    store: Store,
    sessionId: string,
    options: { formatTable: boolean } = { formatTable: true },
  ) {
    const writes = buildQuotationWrites(quotation, store)
    await this.runGraphBatch(
      writes.map((write) =>
        this.batchPatch(
          this.rangePath(
            connection,
            quotationWorksheet,
            write.address,
          ),
          sessionId,
          { values: write.values },
        ),
      ),
    )

    if (options.formatTable) {
      await this.formatQuotationTable(
        connection,
        quotation.items.length,
        sessionId,
      )
    }

    await this.verifyQuotationWrites(connection, writes, sessionId)
  }

  private async verifyQuotationWrites(
    connection: WorkbookConnection,
    writes: ReturnType<typeof buildQuotationWrites>,
    sessionId: string,
  ) {
    const mismatchedWrites = new Set(writes.map((write) => write.address))

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await Promise.all(
        writes
          .filter((write) => mismatchedWrites.has(write.address))
          .map(async (write) => {
            const actual = await this.graphClient.request<RangeValue>(
              this.rangePath(
                connection,
                quotationWorksheet,
                write.address,
              ),
              { headers: this.sessionHeaders(sessionId) },
            )

            if (rangeValuesMatch(write.values, actual.values)) {
              mismatchedWrites.delete(write.address)
            }
          }),
      )

      if (mismatchedWrites.size === 0) {
        return
      }

      if (attempt < 8) {
        await delay(250 * attempt)
      }
    }

    throw new AppError(
      `Excel did not verify the quotation range ${
        [...mismatchedWrites][0]
      }`,
      502,
    )
  }

  private async formatQuotationTable(
    connection: WorkbookConnection,
    itemCount: number,
    sessionId: string,
  ) {
    const layout = buildQuotationTableLayout(itemCount)
    const rowFormatting = buildQuotationItemRowFormatting(itemCount)
    const resetRangePath = this.rangePath(
      connection,
      quotationWorksheet,
      layout.resetRange,
    )

    await this.runGraphBatch([
      this.batchPatch(resetRangePath, sessionId, {
        rowHidden: false,
      }),
      this.batchPatch(`${resetRangePath}/format`, sessionId, {
          verticalAlignment: 'Center',
      }),
      this.batchPatch(`${resetRangePath}/format/fill`, sessionId, {
        color: '#FFFFFF',
      }),
    ])

    await this.setQuotationBorders(
      connection,
      layout.resetRange,
      '#FFFFFF',
      'Hairline',
      sessionId,
    )
    await this.setQuotationBorders(
      connection,
      layout.itemRange,
      '#000000',
      'Hairline',
      sessionId,
    )

    const itemRangePath = this.rangePath(
      connection,
      quotationWorksheet,
      rowFormatting.itemRange,
    )
    const serialRangePath = this.rangePath(
      connection,
      quotationWorksheet,
      rowFormatting.serialRange,
    )
    const descriptionRangePath = this.rangePath(
      connection,
      quotationWorksheet,
      rowFormatting.descriptionRange,
    )
    const quantityRangePath = this.rangePath(
      connection,
      quotationWorksheet,
      rowFormatting.quantityRange,
    )
    const unitPriceRangePath = this.rangePath(
      connection,
      quotationWorksheet,
      rowFormatting.unitPriceRange,
    )
    const totalPriceRangePath = this.rangePath(
      connection,
      quotationWorksheet,
      rowFormatting.totalPriceRange,
    )

    await this.runGraphBatch([
      this.batchPatch(`${itemRangePath}/format`, sessionId, {
          verticalAlignment: 'Center',
          wrapText: true,
      }),
      this.batchPatch(`${serialRangePath}/format`, sessionId, {
          horizontalAlignment: 'Center',
          verticalAlignment: 'Center',
          wrapText: true,
      }),
      this.batchPatch(`${descriptionRangePath}/format`, sessionId, {
          horizontalAlignment: 'Left',
          verticalAlignment: 'Center',
          wrapText: true,
      }),
      this.batchPatch(`${quantityRangePath}/format`, sessionId, {
          horizontalAlignment: 'Center',
          verticalAlignment: 'Center',
          wrapText: true,
      }),
      this.batchPatch(`${unitPriceRangePath}/format`, sessionId, {
          horizontalAlignment: 'Center',
          verticalAlignment: 'Center',
          wrapText: true,
      }),
      this.batchPatch(`${totalPriceRangePath}/format`, sessionId, {
          horizontalAlignment: 'Center',
          verticalAlignment: 'Center',
          wrapText: true,
      }),
    ])

    await this.graphClient.request<void>(
      `${itemRangePath}/format/autofitRows`,
      {
        method: 'POST',
        headers: this.sessionHeaders(sessionId),
        body: JSON.stringify({}),
      },
    )

    const totalRangePath = this.rangePath(
      connection,
      quotationWorksheet,
      layout.totalRange,
    )
    await this.runGraphBatch([
      this.batchPatch(totalRangePath, sessionId, {
        rowHidden: false,
      }),
      this.batchPatch(`${totalRangePath}/format`, sessionId, {
          horizontalAlignment: 'General',
          verticalAlignment: 'Bottom',
          wrapText: false,
      }),
      this.batchPatch(`${totalRangePath}/format/font`, sessionId, {
          bold: false,
          color: '#9C0006',
          italic: false,
          name: 'Calibri',
          size: 9,
          underline: 'None',
      }),
      this.batchPatch(`${totalRangePath}/format/fill`, sessionId, {
        color: '#FFC7CE',
      }),
    ])
    await this.setQuotationBorders(
      connection,
      layout.totalRange,
      '#000000',
      'Thin',
      sessionId,
    )

    await this.graphClient.request<void>(
      `${totalRangePath}/format/autofitRows`,
      {
        method: 'POST',
        headers: this.sessionHeaders(sessionId),
        body: JSON.stringify({}),
      },
    )

    if (layout.unusedRange) {
      await this.graphClient.request<void>(
        this.rangePath(
          connection,
          quotationWorksheet,
          layout.unusedRange,
        ),
        {
          method: 'PATCH',
          headers: this.sessionHeaders(sessionId),
          body: JSON.stringify({ rowHidden: true }),
        },
      )
    }
  }

  private async setQuotationBorders(
    connection: WorkbookConnection,
    address: string,
    color: '#000000' | '#FFFFFF',
    weight: 'Hairline' | 'Thin',
    sessionId: string,
  ) {
    const rangePath = this.rangePath(
      connection,
      quotationWorksheet,
      address,
    )

    await this.runGraphBatch(
      quotationBorderSides.map((sideIndex) =>
        this.batchPatch(
          `${rangePath}/format/borders/${sideIndex}`,
          sessionId,
          {
            color,
            style: 'Continuous',
            weight,
          },
        ),
      ),
    )
  }

  private async writeSummary(
    connection: WorkbookConnection,
    quotation: SavedQuotation,
    store: Store,
    sessionId: string,
  ) {
    const summaryWrite = buildSummaryWrite(quotation, store)
    await this.graphClient.request<RangeValue>(
      this.rangePath(
        connection,
        summaryWorksheet,
        summaryWrite.address,
      ),
      {
        method: 'PATCH',
        headers: this.sessionHeaders(sessionId),
        body: JSON.stringify({
          values: summaryWrite.values,
        }),
      },
    )
    await this.formatSummaryRange(
      connection,
      summaryWrite.address,
      sessionId,
    )
    const summaryVerified = await waitForExpectedRange(
      async () =>
        (
          await this.graphClient.request<RangeValue>(
            this.rangePath(
              connection,
              summaryWorksheet,
              summaryWrite.address,
            ),
            { headers: this.sessionHeaders(sessionId) },
          )
        ).values,
      summaryWrite.values,
    )

    if (!summaryVerified) {
      throw new AppError('Excel did not verify the fixed summary row', 502)
    }

    return true
  }

  private async readRecordGrid() {
    const connection = await this.requireConnection()
    const config = financialRecordConfig
    const worksheet = encodeURIComponent(config.worksheet)
    const usedRange = await this.graphClient.request<UsedRange>(
      `/me/drive/items/${connection.driveItemId}/workbook/worksheets/${worksheet}/usedRange(valuesOnly=true)`,
    )
    const lastUsedRow = Math.max(
      usedRange.rowIndex + usedRange.rowCount,
      1,
    )
    const address = `A1:${config.endColumn}${lastUsedRow}`
    const range = await this.graphClient.request<RangeValue>(
      this.rangePath(connection, config.worksheet, address),
    )

    return buildRecordGrid(config, range.values, address)
  }

  private async readRecordRow(
    connection: WorkbookConnection,
    worksheet: string,
    rowAddress: string,
    columnCount: number,
    sessionId: string,
  ) {
    const range = await this.graphClient.request<RangeValue>(
      this.rangePath(connection, worksheet, rowAddress),
      { headers: this.sessionHeaders(sessionId) },
    )

    return normalizeRecordRow(range.values?.[0], columnCount)
  }

  private async formatSummaryRange(
    connection: WorkbookConnection,
    address: string,
    sessionId: string,
  ) {
    const rangePath = this.rangePath(
      connection,
      summaryWorksheet,
      address,
    )
    await this.runGraphBatch([
      this.batchPatch(`${rangePath}/format`, sessionId, {
        horizontalAlignment: 'Center',
        verticalAlignment: 'Center',
        wrapText: true,
      }),
      ...[
        'EdgeTop',
        'EdgeBottom',
        'EdgeLeft',
        'EdgeRight',
        'InsideVertical',
        'InsideHorizontal',
      ].map((sideIndex) =>
        this.batchPatch(
          `${rangePath}/format/borders/${sideIndex}`,
          sessionId,
          {
            color: '#1f2937',
            style: 'Continuous',
            weight: 'Thin',
          },
        ),
      ),
    ])

    await this.graphClient.request<void>(
      `${rangePath}/format/autofitRows`,
      {
        method: 'POST',
        headers: this.sessionHeaders(sessionId),
        body: JSON.stringify({}),
      },
    )
  }

  private async appendFinancial(
    connection: WorkbookConnection,
    quotation: SavedQuotation,
    store: Store,
    sessionId: string,
  ) {
    const worksheet = encodeURIComponent(financialWorksheet)
    const usedRange = await this.graphClient.request<UsedRange>(
      `/me/drive/items/${connection.driveItemId}/workbook/worksheets/${worksheet}/usedRange(valuesOnly=true)`,
      { headers: this.sessionHeaders(sessionId) },
    )
    const lastUsedRow = Math.max(
      usedRange.rowIndex + usedRange.rowCount,
      1,
    )
    const range = await this.graphClient.request<RangeValue>(
      this.rangePath(
        connection,
        financialWorksheet,
        `A1:L${lastUsedRow}`,
      ),
      { headers: this.sessionHeaders(sessionId) },
    )
    const rows = range.values ?? []
    const normalizedQtn = quotation.qtnNo.trim().toLowerCase()
    const alreadyExists = rows
      .slice(1)
      .some(
        (row) =>
          String(row[2] ?? '').trim().toLowerCase() === normalizedQtn,
      )

    if (alreadyExists) {
      return false
    }

    let lastContentRow = 1
    rows.forEach((row, index) => {
      if (
        row.some(
          (value) =>
            value !== null && value !== undefined && value !== '',
        )
      ) {
        lastContentRow = index + 1
      }
    })

    const nextRow = Math.max(lastContentRow + 1, 2)
    const financialValues = buildFinancialRow(quotation, store)
    const address = `A${nextRow}:L${nextRow}`
    await this.graphClient.request<RangeValue>(
      this.rangePath(connection, financialWorksheet, address),
      {
        method: 'PATCH',
        headers: this.sessionHeaders(sessionId),
        body: JSON.stringify({ values: [financialValues] }),
      },
    )
    const financialVerified = await waitForExpectedRange(
      async () =>
        (
          await this.graphClient.request<RangeValue>(
            this.rangePath(connection, financialWorksheet, address),
            { headers: this.sessionHeaders(sessionId) },
          )
        ).values,
      [financialValues],
    )

    if (!financialVerified) {
      throw new AppError('Excel did not verify the new financial row', 502)
    }

    return true
  }

  private sessionHeaders(sessionId: string) {
    return { 'workbook-session-id': sessionId }
  }

  private batchPatch(
    url: string,
    sessionId: string,
    body: Record<string, unknown>,
  ): Omit<GraphBatchRequest, 'id'> {
    return {
      method: 'PATCH',
      url,
      headers: {
        ...this.sessionHeaders(sessionId),
        'Content-Type': 'application/json',
      },
      body,
    }
  }

  private async runGraphBatch(
    requests: Array<Omit<GraphBatchRequest, 'id'>>,
  ) {
    for (let index = 0; index < requests.length; index += 20) {
      await this.graphClient.requestBatch(
        requests.slice(index, index + 20).map((request, offset) => ({
          id: String(index + offset + 1),
          ...request,
        })),
      )
    }
  }

  private async withWorkbookSession<T>(
    connection: WorkbookConnection,
    action: (sessionId: string) => Promise<T>,
  ) {
    const session = await this.graphClient.request<WorkbookSession>(
      `/me/drive/items/${connection.driveItemId}/workbook/createSession`,
      {
        method: 'POST',
        body: JSON.stringify({ persistChanges: true }),
      },
    )

    try {
      return await action(session.id)
    } finally {
      await this.graphClient.request<void>(
        `/me/drive/items/${connection.driveItemId}/workbook/closeSession`,
        {
          method: 'POST',
          headers: this.sessionHeaders(session.id),
          body: JSON.stringify({}),
        },
      )
    }
  }

  private listWorksheets(driveItemId: string, sessionId?: string) {
    return this.graphClient
      .request<WorksheetsResponse>(
        `/me/drive/items/${driveItemId}/workbook/worksheets?$select=id,name,visibility`,
        sessionId ? { headers: this.sessionHeaders(sessionId) } : {},
      )
      .then((response) => response.value)
  }

  private setWorksheetVisibility(
    driveItemId: string,
    worksheetId: string,
    visibility: string,
    sessionId?: string,
  ) {
    return this.graphClient.request<void>(
      `/me/drive/items/${driveItemId}/workbook/worksheets/${encodeURIComponent(worksheetId)}`,
      {
        method: 'PATCH',
        headers: sessionId ? this.sessionHeaders(sessionId) : undefined,
        body: JSON.stringify({ visibility }),
      },
    )
  }

  private async restoreWorksheetVisibility(
    driveItemId: string,
    originalWorksheets: WorksheetVisibility[],
  ) {
    const mismatch = await this.applyAndWaitForWorksheetVisibility(
      driveItemId,
      originalWorksheets,
    )

    if (mismatch) {
      throw new AppError(
        `Could not restore worksheet visibility for ${mismatch.name}`,
        502,
      )
    }
  }

  private async applyAndWaitForWorksheetVisibility(
    driveItemId: string,
    expectedWorksheets: WorksheetVisibility[],
  ) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const currentWorksheets = await this.listWorksheets(driveItemId)
      const currentById = new Map(
        currentWorksheets.map((worksheet) => [worksheet.id, worksheet]),
      )
      const mismatches = expectedWorksheets.filter(
        (expected) =>
          currentById.get(expected.id)?.visibility !== expected.visibility,
      )

      if (mismatches.length === 0) {
        return undefined
      }

      if (attempt === 0 || attempt === 4 || attempt === 8) {
        await Promise.all(
          mismatches.map((mismatch) =>
            this.setWorksheetVisibility(
              driveItemId,
              mismatch.id,
              mismatch.visibility,
            ),
          ),
        )
      }

      await delay(Math.min(250 * (attempt + 1), 2_000))
    }

    const finalWorksheets = await this.listWorksheets(driveItemId)
    const finalById = new Map(
      finalWorksheets.map((worksheet) => [worksheet.id, worksheet]),
    )
    return expectedWorksheets.find(
      (expected) =>
        finalById.get(expected.id)?.visibility !== expected.visibility,
    )
  }

  private async recoverPendingVisibility() {
    const journal = await readVisibilityJournal()

    if (!journal) {
      return
    }

    await this.restoreWorksheetVisibility(
      journal.driveItemId,
      journal.worksheets,
    )
    await clearVisibilityJournal()
  }

  private convertWorkbookToPdf(connection: WorkbookConnection) {
    return this.graphClient.requestBinary(
      `/me/drive/items/${connection.driveItemId}/content?format=pdf`,
    )
  }

  private async convertWorksheetToPdf(
    connection: WorkbookConnection,
    worksheetName: string,
  ) {
    const worksheets = await this.listWorksheets(connection.driveItemId)
    const targetWorksheet = worksheets.find(
      (worksheet) => worksheet.name === worksheetName,
    )

    if (!targetWorksheet) {
      throw new AppError(
        `Could not find worksheet ${worksheetName}`,
        404,
      )
    }

    await saveVisibilityJournal({
      driveItemId: connection.driveItemId,
      worksheets,
    })

    try {
      const exportVisibility = worksheets.map((worksheet) => ({
        ...worksheet,
        visibility:
          worksheet.id === targetWorksheet.id
            ? 'Visible'
            : worksheet.visibility === 'Visible'
              ? 'Hidden'
              : worksheet.visibility,
      }))
      const exportMismatch =
        await this.applyAndWaitForWorksheetVisibility(
          connection.driveItemId,
          exportVisibility,
        )

      if (exportMismatch) {
        throw new AppError(
          `Could not isolate worksheet ${worksheetName} for PDF conversion`,
          502,
        )
      }

      return await this.graphClient.requestBinary(
        `/me/drive/items/${connection.driveItemId}/content?format=pdf`,
      )
    } finally {
      await this.restoreWorksheetVisibility(
        connection.driveItemId,
        worksheets,
      )
      await clearVisibilityJournal()
    }
  }
}
