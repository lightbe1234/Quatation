import { afterAll, describe, expect, it } from 'vitest'
import type { Store } from '../types/store.js'
import { SupabaseStoreRepository } from './storeRepository.js'

const repository = new SupabaseStoreRepository()
const createdStores: Store[] = []

describe('SupabaseStoreRepository integration', () => {
  afterAll(async () => {
    await Promise.all(createdStores.map((store) => repository.delete(store.id)))
  }, 20_000)

  it('persists a complete Store CRUD lifecycle in Supabase', async () => {
    const uniqueNo = `TEST-${Date.now()}`
    const created = await repository.create({
      storeNo: uniqueNo,
      storeName: 'Integration Test Store',
      contactName: 'Test Contact',
      branch: 'Test Branch',
      branchId: 'TEST-BRN',
      region: 'Test Region',
      clientName: 'Test Client',
    })
    createdStores.push(created)

    const fetched = await repository.findById(created.id)
    expect(fetched.storeNo).toBe(uniqueNo)

    const listed = await repository.list()
    expect(listed.some((store) => store.id === created.id)).toBe(true)

    const updated = await repository.update(created.id, {
      ...created,
      storeName: 'Updated Integration Test Store',
    })
    expect(updated.storeName).toBe('Updated Integration Test Store')

    await repository.delete(created.id)
    createdStores.splice(
      createdStores.findIndex((store) => store.id === created.id),
      1,
    )

    const afterDelete = await repository.list()
    expect(afterDelete.some((store) => store.id === created.id)).toBe(false)
  }, 20_000)
})
