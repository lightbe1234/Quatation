import { Router, type Response } from 'express'
import type { OneDriveService } from '../graph/oneDriveService.js'
import type { QuotationRepository } from '../repositories/quotationRepository.js'
import type { StoreRepository } from '../repositories/storeRepository.js'
import { parseQuotationInput } from '../validation/quotationInput.js'

function requireLinkedStore(
  response: Response,
  storeId: string | null,
): storeId is string {
  if (storeId) {
    return true
  }

  response.status(409).json({
    error:
      'This quotation is missing its Branch link. Start a new quotation with a current Branch before generating PDF or transferring to Financial.',
  })
  return false
}

export function createQuotationsRouter(
  repository: QuotationRepository,
  storeRepository: StoreRepository,
  oneDriveService: OneDriveService,
) {
  const router = Router()

  router.get('/', async (_request, response) => {
    response.json({ quotations: await repository.listRecent() })
  })

  router.post('/', async (request, response) => {
    const quotation = await repository.create(
      parseQuotationInput(request.body),
    )
    response.status(201).json({ quotation })
  })

  router.get('/:id', async (request, response) => {
    response.json({ quotation: await repository.findById(request.params.id) })
  })

  router.post('/:id/generate-pdf', async (request, response) => {
    if (request.body?.confirmed !== true) {
      response.status(400).json({
        error: 'Workbook overwrite confirmation is required',
      })
      return
    }

    const quotation = await repository.findById(request.params.id)
    if (!requireLinkedStore(response, quotation.storeId)) {
      return
    }
    const store = await storeRepository.findById(quotation.storeId)
    const result = await oneDriveService.generateQuotationPdf(
      quotation,
      store,
    )
    await repository.markPdfGenerated(quotation.id)
    const safeQtnNo = quotation.qtnNo.replace(/[^a-z0-9_-]+/gi, '-')

    response
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quotation-${safeQtnNo}.pdf"`,
        'X-Quotation-Status': 'PDF_GENERATED',
        'X-Summary-Status': result.summaryCreated
          ? 'created'
          : 'already-existed',
      })
      .send(result.pdf)
  })

  router.post('/:id/transfer-financial', async (request, response) => {
    if (request.body?.confirmed !== true) {
      response.status(400).json({
        error: 'Financial transfer confirmation is required',
      })
      return
    }

    const quotation = await repository.findById(request.params.id)

    if (quotation.status === 'DRAFT') {
      response.status(409).json({
        error: 'Generate the quotation PDF before transferring to Financial',
      })
      return
    }

    if (!requireLinkedStore(response, quotation.storeId)) {
      return
    }
    const store = await storeRepository.findById(quotation.storeId)
    const result = await oneDriveService.transferQuotationToFinancial(
      quotation,
      store,
    )
    const transferredQuotation = await repository.markTransferred(
      quotation.id,
    )

    response.json({
      result: {
        status: transferredQuotation.status,
        transferredAt: transferredQuotation.transferredAt,
        financialStatus: result.financialCreated
          ? 'created'
          : 'already-existed',
      },
    })
  })

  return router
}
