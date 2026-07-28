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
