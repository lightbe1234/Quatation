export type Store = {
  id: string
  storeNo: string
  storeName: string
  contactName: string | null
  branch: string | null
  branchId: string | null
  region: string | null
  clientName: string | null
  createdAt: string
}

export type StoreInput = Omit<Store, 'id' | 'createdAt'>

export type StoreRow = {
  id: string
  store_no: string
  store_name: string
  contact_name: string | null
  branch: string | null
  branch_id: string | null
  region: string | null
  client_name: string | null
  created_at: string
}
