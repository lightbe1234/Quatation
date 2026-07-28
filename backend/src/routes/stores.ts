import { Router } from 'express'
import type { StoreRepository } from '../repositories/storeRepository.js'
import { parseStoreInput } from '../validation/storeInput.js'

export function createStoresRouter(repository: StoreRepository) {
  const router = Router()

  router.get('/', async (_request, response) => {
    response.json({ stores: await repository.list() })
  })

  router.post('/', async (request, response) => {
    const store = await repository.create(parseStoreInput(request.body))
    response.status(201).json({ store })
  })

  router.put('/:id', async (request, response) => {
    const store = await repository.update(
      request.params.id,
      parseStoreInput(request.body),
    )
    response.json({ store })
  })

  router.delete('/:id', async (request, response) => {
    await repository.delete(request.params.id)
    response.status(204).send()
  })

  return router
}
