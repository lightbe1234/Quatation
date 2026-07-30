import cors from 'cors'
import express, { type RequestHandler } from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requireAppAuth } from './middleware/requireAppAuth.js'
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
import {
  SupabaseQuotationFieldOptionRepository,
  type QuotationFieldOptionRepository,
} from './repositories/quotationFieldOptionRepository.js'
import { healthRouter } from './routes/health.js'
import { createOneDriveRouter } from './routes/oneDrive.js'
import { createQuotationsRouter } from './routes/quotations.js'
import { createRecordsRouter } from './routes/records.js'
import { createStoresRouter } from './routes/stores.js'
import { createSettingsRouter } from './routes/settings.js'

export function createApp(
  storeRepository: StoreRepository = new SupabaseStoreRepository(),
  quotationRepository: QuotationRepository = new SupabaseQuotationRepository(),
  oneDriveService: OneDriveService = new MicrosoftOneDriveService(),
  fieldOptionRepository: QuotationFieldOptionRepository =
    new SupabaseQuotationFieldOptionRepository(),
  authenticate: RequestHandler = requireAppAuth,
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
  app.use('/api/stores', authenticate, createStoresRouter(storeRepository))
  app.use(
    '/api/settings',
    authenticate,
    createSettingsRouter(fieldOptionRepository),
  )
  app.use('/api/records', authenticate, createRecordsRouter(oneDriveService))
  app.use(
    '/api/quotations',
    authenticate,
    createQuotationsRouter(
      quotationRepository,
      storeRepository,
      oneDriveService,
    ),
  )
  app.use(createOneDriveRouter(oneDriveService, authenticate))

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found' })
  })

  app.use(errorHandler)

  return app
}

export const app = createApp()

export default app
