import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { errorHandler } from '../middleware/errorHandler.js'
import type { OneDriveService } from '../graph/oneDriveService.js'
import type {
  RecordCell,
  WorkbookRecordGrid,
} from '../graph/recordGrid.js'
import { createRecordsRouter } from './records.js'

const financialGrid: WorkbookRecordGrid = {
  address: 'A1:L2',
  headers: [
    'Specialist',
    'Approval Status',
    'QTN/NO',
    'Store No.',
    'Inv/Type',
    'Job Report',
    'Product Description',
    'Region',
    'QTY',
    'Unit',
    'Before Approval',
    'After Approval',
  ],
  kind: 'financial',
  rows: [
    {
      rowNumber: 2,
      values: [
        'Specialist',
        'Pending',
        'QTN-1',
        '1830120',
        'OPEX',
        'JOB-1',
        '(Service)',
        'North',
        1,
        'Unit',
        100,
        '',
      ],
    },
  ],
  worksheet: 'financial ',
}

class FakeRecordsService {
  updated?: { rowNumber: number; values: RecordCell[] }
  deletedRow?: number

  async getRecordGrids() {
    return { financial: financialGrid }
  }

  async updateRecordRow(
    _kind: 'financial',
    rowNumber: number,
    values: RecordCell[],
  ) {
    this.updated = { rowNumber, values }
    return financialGrid
  }

  async deleteRecordRow(_kind: 'financial', rowNumber: number) {
    this.deletedRow = rowNumber
    return { ...financialGrid, rows: [] }
  }
}

function createTestApp(service: FakeRecordsService) {
  const app = express()
  app.use(express.json())
  app.use(
    '/api/records',
    createRecordsRouter(service as unknown as OneDriveService),
  )
  app.use(errorHandler)
  return app
}

describe('Financial Records routes', () => {
  it('lists Financial Records without exposing Summary Records', async () => {
    const response = await request(createTestApp(new FakeRecordsService()))
      .get('/api/records')

    expect(response.status).toBe(200)
    expect(response.body.records.financial.rows[0].values[2]).toBe('QTN-1')
    expect(response.body.records.summary).toBeUndefined()
  })

  it('updates a confirmed Financial row', async () => {
    const service = new FakeRecordsService()
    const values = [...financialGrid.rows[0].values]
    values[1] = 'Approved'

    const response = await request(createTestApp(service))
      .put('/api/records/financial/2')
      .send({ confirmed: true, values })

    expect(response.status).toBe(200)
    expect(service.updated).toEqual({ rowNumber: 2, values })
  })

  it('requires confirmation before deleting a Financial row', async () => {
    const service = new FakeRecordsService()

    const denied = await request(createTestApp(service))
      .delete('/api/records/financial/2')
      .send({ confirmed: false })
    expect(denied.status).toBe(400)
    expect(service.deletedRow).toBeUndefined()

    const confirmed = await request(createTestApp(service))
      .delete('/api/records/financial/2')
      .send({ confirmed: true })
    expect(confirmed.status).toBe(200)
    expect(service.deletedRow).toBe(2)
  })

  it('rejects Summary Records routes', async () => {
    const response = await request(createTestApp(new FakeRecordsService()))
      .put('/api/records/summary/2')
      .send({ confirmed: true, values: [] })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Record type must be financial' })
  })
})
