import { Router } from 'express'
import { AppError } from '../errors/appError.js'
import type { QuotationFieldOptionRepository } from '../repositories/quotationFieldOptionRepository.js'
import { parseQuotationFieldOptionInput } from '../validation/quotationFieldOptionInput.js'

export function createSettingsRouter(
  repository: QuotationFieldOptionRepository,
) {
  const router = Router()

  router.get('/options', async (_request, response) => {
    response.json({ options: await repository.list() })
  })

  router.post('/options', async (request, response) => {
    const option = await repository.create(
      parseQuotationFieldOptionInput(request.body),
    )
    response.status(201).json({ option })
  })

  router.put('/options/:id', async (request, response) => {
    const option = await repository.update(
      request.params.id,
      parseQuotationFieldOptionInput(request.body),
    )
    response.json({ option })
  })

  router.delete('/options/:id', async (request, response) => {
    if (request.body?.confirmed !== true) {
      throw new AppError('Confirmation is required before deleting an option', 400)
    }

    await repository.delete(request.params.id)
    response.status(204).send()
  })

  return router
}
