import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import type {
  GeneratePdfResult,
  OneDriveService,
  TransferFinancialResult,
} from '../graph/oneDriveService.js'
import type { QuotationRepository } from '../repositories/quotationRepository.js'
import type { StoreRepository } from '../repositories/storeRepository.js'
import type {
  QuotationInput,
  SavedQuotation,
} from '../types/quotation.js'
import { allowTestAuth } from '../test/allowTestAuth.js'

const storeRepository: StoreRepository = {
  list: async () => [],
  findById: async () => ({
    id: 'f9b725e0-d234-4ef4-b513-5c83285a7036',
    storeNo: '1830120',
    storeName: 'Duwadmi',
    contactName: 'Test Contact',
    branch: 'Test Branch',
    branchId: 'TEST-BRN',
    region: 'Test Region',
    clientName: null,
    createdAt: '2026-07-23T00:00:00.000Z',
  }),
  create: async () => {
    throw new Error('Not used')
  },
  update: async () => {
    throw new Error('Not used')
  },
  delete: async () => undefined,
}

class MemoryQuotationRepository implements QuotationRepository {
  quotation?: SavedQuotation

  async listRecent() {
    return this.quotation
      ? [
          {
            id: this.quotation.id,
            qtnNo: this.quotation.qtnNo,
            storeId: this.quotation.storeId,
            grandTotal: this.quotation.grandTotal,
            status: this.quotation.status,
            pdfGeneratedAt: this.quotation.pdfGeneratedAt,
            transferredAt: this.quotation.transferredAt,
            createdAt: this.quotation.createdAt,
          },
        ]
      : []
  }

  async create(input: QuotationInput) {
    this.quotation = {
      ...input,
      id: crypto.randomUUID(),
      grandTotal: 19.19,
      status: 'DRAFT',
      pdfGeneratedAt: null,
      transferredAt: null,
      createdAt: new Date().toISOString(),
      items: input.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        totalPrice: item.lineNo === 1 ? 12.53 : 6.66,
      })),
    }
    return this.quotation
  }

  async findById() {
    if (!this.quotation) {
      throw new Error('Quotation not found')
    }
    return this.quotation
  }

  async markPdfGenerated() {
    if (!this.quotation) {
      throw new Error('Quotation not found')
    }

    this.quotation = {
      ...this.quotation,
      status: 'PDF_GENERATED',
      pdfGeneratedAt: new Date().toISOString(),
    }
    return this.quotation
  }

  async markTransferred() {
    if (!this.quotation) {
      throw new Error('Quotation not found')
    }

    this.quotation = {
      ...this.quotation,
      status: 'TRANSFERRED',
      transferredAt: new Date().toISOString(),
    }
    return this.quotation
  }
}

class FakeOneDriveService implements OneDriveService {
  generateCalls = 0
  transferCalls = 0
  createAuthorizationUrl = async () => ''
  completeAuthorization = async () => undefined
  getStatus = async () => ({ connected: true })
  refreshPdfTemplate = async () => ({
    name: 'Web app PDF Export.xlsx',
    refreshedAt: new Date().toISOString(),
  })
  inspectSafeTestCell = async () => ({
    worksheet: 'Quatation',
    address: 'J1',
    usedRange: 'Quatation!A1:H38',
  })
  runTestCell = async () => ({
    address: 'Quatation!J1',
    verified: true as const,
    restored: true as const,
  })
  getSummaryGrid = async () => ({
    address: 'A1:H1',
    worksheet: 'summry' as const,
    headers: [],
    rows: [],
  })
  generateQuotationPdf = async (): Promise<GeneratePdfResult> => {
    this.generateCalls += 1
    return {
      pdf: Buffer.from('%PDF-test'),
      summaryCreated: true,
    }
  }
  transferQuotationToFinancial =
    async (): Promise<TransferFinancialResult> => {
      this.transferCalls += 1
      return { financialCreated: true }
    }
}

const validQuotation = {
  qtnNo: 'QTN-TEST-001',
  jobNo: 'JOB-001',
  quoteDate: '2026-07-23',
  unit: 'Maintenance',
  clientName: "McDonald's",
  region: 'North Region',
  storeId: 'f9b725e0-d234-4ef4-b513-5c83285a7036',
  subject: 'Test quotation',
  introLine1: 'Intro one',
  introLine2: 'Intro two',
  items: [
    { description: 'First item', qty: 1.25, unitPrice: 10.02 },
    { description: 'Second item', qty: 2, unitPrice: 3.33 },
  ],
}

function createTestApp(
  repository: QuotationRepository,
  oneDriveService?: OneDriveService,
) {
  return createApp(
    storeRepository,
    repository,
    oneDriveService,
    undefined,
    allowTestAuth,
  )
}

describe('Quotation routes', () => {
  it('lists recent quotations for resumed workflows', async () => {
    const repository = new MemoryQuotationRepository()
    await repository.create({
      ...validQuotation,
      items: validQuotation.items.map((item, index) => ({
        ...item,
        lineNo: index + 1,
      })),
    })
    const response = await request(createTestApp(repository)).get(
      '/api/quotations',
    )

    expect(response.status).toBe(200)
    expect(response.body.quotations).toHaveLength(1)
    expect(response.body.quotations[0].qtnNo).toBe('QTN-TEST-001')
  })

  it('validates and creates a draft quotation', async () => {
    const repository = new MemoryQuotationRepository()
    const response = await request(createTestApp(repository))
      .post('/api/quotations')
      .send(validQuotation)

    expect(response.status).toBe(201)
    expect(response.body.quotation.status).toBe('DRAFT')
    expect(repository.quotation?.items[0].lineNo).toBe(1)
    expect(repository.quotation?.items[1].lineNo).toBe(2)
  })

  it('rejects more than 12 line items', async () => {
    const response = await request(
      createTestApp(new MemoryQuotationRepository()),
    )
      .post('/api/quotations')
      .send({
        ...validQuotation,
        items: Array.from({ length: 13 }, (_, index) => ({
          description: `Item ${index + 1}`,
          qty: 1,
          unitPrice: 1,
        })),
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'A quotation can contain no more than 12 line items',
    })
  })

  it('requires visible confirmation before replacing workbook values', async () => {
    const repository = new MemoryQuotationRepository()
    await repository.create({
      ...validQuotation,
      items: validQuotation.items.map((item, index) => ({
        ...item,
        lineNo: index + 1,
      })),
    })
    const oneDriveService = new FakeOneDriveService()
    const response = await request(
      createTestApp(repository, oneDriveService),
    )
      .post(`/api/quotations/${repository.quotation?.id}/generate-pdf`)
      .send({})

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Workbook overwrite confirmation is required',
    })
    expect(oneDriveService.generateCalls).toBe(0)
  })

  it('returns a PDF, logs the summary, and marks the quotation generated', async () => {
    const repository = new MemoryQuotationRepository()
    await repository.create({
      ...validQuotation,
      items: validQuotation.items.map((item, index) => ({
        ...item,
        lineNo: index + 1,
      })),
    })
    const oneDriveService = new FakeOneDriveService()
    const response = await request(
      createTestApp(repository, oneDriveService),
    )
      .post(`/api/quotations/${repository.quotation?.id}/generate-pdf`)
      .send({ confirmed: true })

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(response.headers['x-summary-status']).toBe('created')
    expect(response.body.toString()).toBe('%PDF-test')
    expect(repository.quotation?.status).toBe('PDF_GENERATED')
    expect(oneDriveService.generateCalls).toBe(1)
  })

  it('requires confirmation and a generated PDF before financial transfer', async () => {
    const repository = new MemoryQuotationRepository()
    await repository.create({
      ...validQuotation,
      items: validQuotation.items.map((item, index) => ({
        ...item,
        lineNo: index + 1,
      })),
    })
    const oneDriveService = new FakeOneDriveService()
    const app = createTestApp(repository, oneDriveService)
    const withoutConfirmation = await request(app)
      .post(
        `/api/quotations/${repository.quotation?.id}/transfer-financial`,
      )
      .send({})

    expect(withoutConfirmation.status).toBe(400)
    expect(withoutConfirmation.body).toEqual({
      error: 'Financial transfer confirmation is required',
    })

    const draftTransfer = await request(app)
      .post(
        `/api/quotations/${repository.quotation?.id}/transfer-financial`,
      )
      .send({ confirmed: true })

    expect(draftTransfer.status).toBe(409)
    expect(draftTransfer.body).toEqual({
      error: 'Generate the quotation PDF before transferring to Financial',
    })
    expect(oneDriveService.transferCalls).toBe(0)
  })

  it('appends Financial and marks the quotation transferred', async () => {
    const repository = new MemoryQuotationRepository()
    await repository.create({
      ...validQuotation,
      items: validQuotation.items.map((item, index) => ({
        ...item,
        lineNo: index + 1,
      })),
    })
    await repository.markPdfGenerated()
    const oneDriveService = new FakeOneDriveService()
    const response = await request(
      createTestApp(repository, oneDriveService),
    )
      .post(
        `/api/quotations/${repository.quotation?.id}/transfer-financial`,
      )
      .send({ confirmed: true })

    expect(response.status).toBe(200)
    expect(response.body.result.status).toBe('TRANSFERRED')
    expect(response.body.result.financialStatus).toBe('created')
    expect(repository.quotation?.status).toBe('TRANSFERRED')
    expect(oneDriveService.transferCalls).toBe(1)
  })

  it('rejects Financial transfer when an old quotation has no linked store', async () => {
    const repository = new MemoryQuotationRepository()
    await repository.create({
      ...validQuotation,
      items: validQuotation.items.map((item, index) => ({
        ...item,
        lineNo: index + 1,
      })),
    })
    await repository.markPdfGenerated()
    if (repository.quotation) {
      repository.quotation = {
        ...repository.quotation,
        storeId: null,
      }
    }
    const oneDriveService = new FakeOneDriveService()
    const response = await request(
      createTestApp(repository, oneDriveService),
    )
      .post(
        `/api/quotations/${repository.quotation?.id}/transfer-financial`,
      )
      .send({ confirmed: true })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error:
        'This quotation is missing its Branch link. Start a new quotation with a current Branch before generating PDF or transferring to Financial.',
    })
    expect(oneDriveService.transferCalls).toBe(0)
  })
})
