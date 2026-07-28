import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import type {
  OneDriveService,
  OneDriveStatus,
  TestCellCandidate,
} from '../graph/oneDriveService.js'
import type { SummaryGrid } from '../graph/summaryGrid.js'
import type { QuotationRepository } from '../repositories/quotationRepository.js'
import type { StoreRepository } from '../repositories/storeRepository.js'

const storeRepository = {} as StoreRepository
const quotationRepository = {} as QuotationRepository

class FakeOneDriveService implements OneDriveService {
  createAuthorizationUrl = async () => 'https://login.microsoftonline.com/test'
  completeAuthorization = async () => undefined
  getStatus = async (): Promise<OneDriveStatus> => ({
    connected: true,
    workbook: {
      name: 'Web app.xlsx',
      connectedAt: '2026-07-23T00:00:00.000Z',
    },
  })
  inspectSafeTestCell = async (): Promise<TestCellCandidate> => ({
    worksheet: 'Quatation',
    address: 'J1',
    usedRange: 'Quatation!A1:H50',
  })
  runTestCell = async (worksheet: string, address: string) => ({
    address: `${worksheet}!${address}`,
    verified: true as const,
    restored: true as const,
  })
  getSummaryGrid = async (): Promise<SummaryGrid> => ({
    address: 'A1:H2',
    worksheet: 'summry',
    headers: [
      'SNO',
      'QUOTATION REF',
      'OUTLET NAME',
      'AMOUNT',
      'SCOPE OF WORK',
      'JOB STATUS',
      'HD NO',
      'APPROVAL',
    ],
    rows: [
      [1, 'QTN-1', 'Store 1', 25, '(Service)', 'NOT DONE', null, 'AWAITED'],
    ],
  })
  generateQuotationPdf = async () => ({
    pdf: Buffer.from('%PDF-test'),
    summaryCreated: true,
  })
  transferQuotationToFinancial = async () => ({
    financialCreated: true,
  })
}

describe('OneDrive routes', () => {
  const app = createApp(
    storeRepository,
    quotationRepository,
    new FakeOneDriveService(),
  )

  it('reports connection status without exposing tokens', async () => {
    const response = await request(app).get('/api/onedrive/status')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      connected: true,
      workbook: {
        name: 'Web app.xlsx',
        connectedAt: '2026-07-23T00:00:00.000Z',
      },
    })
  })

  it('returns the read-only Summary worksheet grid', async () => {
    const response = await request(app).get('/api/onedrive/summary-grid')

    expect(response.status).toBe(200)
    expect(response.body.grid).toEqual(await new FakeOneDriveService().getSummaryGrid())
  })

  it('downloads a one-sheet Summary Excel workbook', async () => {
    const response = await request(app).get(
      '/api/onedrive/summary-workbook',
    )

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="quotation-summary.xlsx"',
    )
    expect(Number(response.headers['content-length'])).toBeGreaterThan(0)
  })

  it('requires explicit confirmation before a test-cell write', async () => {
    const response = await request(app).post('/api/onedrive/test-cell').send({
      worksheet: 'Quatation',
      address: 'J1',
    })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Test-cell write confirmation is required',
    })
  })

  it('returns a verified and restored test result after confirmation', async () => {
    const response = await request(app).post('/api/onedrive/test-cell').send({
      confirmed: true,
      worksheet: 'Quatation',
      address: 'J1',
    })

    expect(response.status).toBe(200)
    expect(response.body.result).toEqual({
      address: 'Quatation!J1',
      verified: true,
      restored: true,
    })
  })

  it('does not expose a Summary PDF endpoint', async () => {
    const response = await request(app).post('/api/onedrive/summary-pdf')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: 'Route not found',
    })
  })
})
