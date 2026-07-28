import { Router } from 'express'
import { AppError } from '../errors/appError.js'
import type { OneDriveService } from '../graph/oneDriveService.js'
import {
  parseRecordKind,
  parseRecordValues,
  parseRowNumber,
  recordConfig,
} from '../graph/recordGrid.js'

export function createRecordsRouter(service: OneDriveService) {
  const router = Router()

  router.get('/', async (_request, response) => {
    response.json({ records: await service.getRecordGrids() })
  })

  router.put('/:kind/:rowNumber', async (request, response) => {
    if (request.body?.confirmed !== true) {
      throw new AppError('Record update confirmation is required', 400)
    }

    const kind = parseRecordKind(request.params.kind)
    const rowNumber = parseRowNumber(request.params.rowNumber)
    const values = parseRecordValues(
      recordConfig(kind),
      request.body?.values,
    )

    response.json({
      grid: await service.updateRecordRow(kind, rowNumber, values),
    })
  })

  router.delete('/:kind/:rowNumber', async (request, response) => {
    if (request.body?.confirmed !== true) {
      throw new AppError('Record delete confirmation is required', 400)
    }

    const kind = parseRecordKind(request.params.kind)
    const rowNumber = parseRowNumber(request.params.rowNumber)

    response.json({
      grid: await service.deleteRecordRow(kind, rowNumber),
    })
  })

  return router
}
