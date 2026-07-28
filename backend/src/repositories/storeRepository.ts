import { AppError } from '../errors/appError.js'
import { getSupabaseClient } from '../lib/supabase.js'
import type { Store, StoreInput, StoreRow } from '../types/store.js'

export interface StoreRepository {
  list(): Promise<Store[]>
  findById(id: string): Promise<Store>
  create(input: StoreInput): Promise<Store>
  update(id: string, input: StoreInput): Promise<Store>
  delete(id: string): Promise<void>
}

function toStore(row: StoreRow): Store {
  return {
    id: row.id,
    storeNo: row.store_no,
    storeName: row.store_name,
    contactName: row.contact_name,
    branch: row.branch,
    branchId: row.branch_id,
    region: row.region,
    clientName: row.client_name,
    createdAt: row.created_at,
  }
}

function toStoreRow(input: StoreInput) {
  return {
    store_no: input.storeNo,
    store_name: input.storeName,
    contact_name: input.contactName,
    branch: input.branch,
    branch_id: input.branchId,
    region: input.region,
    client_name: input.clientName,
  }
}

function handleDatabaseError(error: { code?: string; message: string }): never {
  if (error.code === '23505') {
    throw new AppError('A store with this Branch ID already exists', 409)
  }

  console.error('Supabase store operation failed:', error.message)
  throw new AppError('The store database operation failed', 502)
}

export class SupabaseStoreRepository implements StoreRepository {
  async list() {
    const { data, error } = await getSupabaseClient()
      .from('stores')
      .select('*')
      .order('store_no')

    if (error) {
      handleDatabaseError(error)
    }

    return (data as StoreRow[]).map(toStore)
  }

  async findById(id: string) {
    const { data, error } = await getSupabaseClient()
      .from('stores')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      handleDatabaseError(error)
    }

    if (!data) {
      throw new AppError('Store not found', 404)
    }

    return toStore(data as StoreRow)
  }

  async create(input: StoreInput) {
    const { data, error } = await getSupabaseClient()
      .from('stores')
      .insert(toStoreRow(input))
      .select()
      .single()

    if (error) {
      handleDatabaseError(error)
    }

    return toStore(data as StoreRow)
  }

  async update(id: string, input: StoreInput) {
    const { data, error } = await getSupabaseClient()
      .from('stores')
      .update(toStoreRow(input))
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      handleDatabaseError(error)
    }

    if (!data) {
      throw new AppError('Store not found', 404)
    }

    return toStore(data as StoreRow)
  }

  async delete(id: string) {
    const { data, error } = await getSupabaseClient()
      .from('stores')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) {
      handleDatabaseError(error)
    }

    if (!data) {
      throw new AppError('Store not found', 404)
    }
  }
}
