import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import {
  SupabaseQuotationRepository,
  type QuotationRepository,
} from './repositories/quotationRepository.js'
import {
  MicrosoftOneDriveService,
  type OneDriveService,
} from './graph/oneDriveService.js'
import {
  SupabaseStoreRepository,
  type StoreRepository,
} from './repositories/storeRepository.js'
import { healthRouter } from './routes/health.js'
import { createOneDriveRouter } from './routes/oneDrive.js'
import { createQuotationsRouter } from './routes/quotations.js'
import { createRecordsRouter } from './routes/records.js'
import { createStoresRouter } from './routes/stores.js'

export function createApp(
  storeRepository: StoreRepository = new SupabaseStoreRepository(),
  quotationRepository: QuotationRepository = new SupabaseQuotationRepository(),
  oneDriveService: OneDriveService = new MicrosoftOneDriveService(),
) {
  const app = express()

  app.use(
    cors({
      origin: env.frontendUrl,
      exposedHeaders: [
        'Content-Disposition',
        'X-Quotation-Status',
        'X-Summary-Status',
      ],
    }),
  )
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/stores', createStoresRouter(storeRepository))
  app.use('/api/records', createRecordsRouter(oneDriveService))
  app.use(
    '/api/quotations',
    createQuotationsRouter(
      quotationRepository,
      storeRepository,
      oneDriveService,
    ),
  )
  app.use(createOneDriveRouter(oneDriveService))

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found' })
  })

  app.use(errorHandler)

  return app
}

export const app = createApp()

export default app
