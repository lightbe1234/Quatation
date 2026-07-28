import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import type { StoreRepository } from '../repositories/storeRepository.js'
import type { Store, StoreInput } from '../types/store.js'

class MemoryStoreRepository implements StoreRepository {
  stores: Store[] = []

  async list() {
    return this.stores
  }

  async findById(id: string) {
    return this.stores.find((store) => store.id === id) as Store
  }

  async create(input: StoreInput) {
    const store: Store = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    this.stores.push(store)
    return store
  }

  async update(id: string, input: StoreInput) {
    const index = this.stores.findIndex((store) => store.id === id)
    const store = { ...this.stores[index], ...input }
    this.stores[index] = store
    return store
  }

  async delete(id: string) {
    this.stores = this.stores.filter((store) => store.id !== id)
  }
}

const validStore = {
  contactName: 'Mr. Ahmed',
  branch: 'Duwadmi',
  branchId: 'BRN-101',
  region: 'North Region',
  clientName: "McDonald's",
}

describe('Store routes', () => {
  let repository: MemoryStoreRepository

  beforeEach(() => {
    repository = new MemoryStoreRepository()
  })

  it('creates, lists, updates, and deletes a store', async () => {
    const app = createApp(repository)
    const created = await request(app).post('/api/stores').send(validStore)

    expect(created.status).toBe(201)
    expect(created.body.store.storeNo).toBe('BRN-101')
    expect(created.body.store.storeName).toBe('Duwadmi')
    expect(created.body.store.region).toBeNull()
    expect(created.body.store.clientName).toBeNull()

    const id = created.body.store.id
    const listed = await request(app).get('/api/stores')
    expect(listed.body.stores).toHaveLength(1)

    const updated = await request(app)
      .put(`/api/stores/${id}`)
      .send({ ...validStore, branch: 'Duwadmi Updated' })
    expect(updated.body.store.branch).toBe('Duwadmi Updated')
    expect(updated.body.store.storeName).toBe('Duwadmi Updated')

    const deleted = await request(app).delete(`/api/stores/${id}`)
    expect(deleted.status).toBe(204)
    expect(repository.stores).toHaveLength(0)
  })

  it('rejects a store without its required fields', async () => {
    const response = await request(createApp(repository))
      .post('/api/stores')
      .send({ branch: 'Duwadmi' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'branchId is required' })
  })
})
