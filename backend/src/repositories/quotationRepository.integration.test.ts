import { afterAll, describe, expect, it } from 'vitest'
import { getSupabaseClient } from '../lib/supabase.js'
import type { SavedQuotation } from '../types/quotation.js'
import type { Store } from '../types/store.js'
import { SupabaseQuotationRepository } from './quotationRepository.js'
import { SupabaseStoreRepository } from './storeRepository.js'

const quotationRepository = new SupabaseQuotationRepository()
const storeRepository = new SupabaseStoreRepository()
let createdStore: Store | undefined
let createdQuotation: SavedQuotation | undefined

describe('SupabaseQuotationRepository integration', () => {
  afterAll(async () => {
    if (createdQuotation) {
      await getSupabaseClient()
        .from('quotations')
        .delete()
        .eq('id', createdQuotation.id)
    }

    if (createdStore) {
      await storeRepository.delete(createdStore.id)
    }
  }, 20_000)

  it('saves and retrieves a quotation with rounded totals', async () => {
    const uniqueValue = Date.now()
    createdStore = await storeRepository.create({
      storeNo: `QTEST-${uniqueValue}`,
      storeName: 'Quotation Test Store',
      contactName: null,
      branch: null,
      branchId: null,
      region: null,
      clientName: null,
    })

    createdQuotation = await quotationRepository.create({
      qtnNo: `QTN-TEST-${uniqueValue}`,
      jobNo: 'JOB-TEST',
      quoteDate: '2026-07-23',
      unit: 'Maintenance',
      clientName: "McDonald's",
      region: 'Integration Region',
      storeId: createdStore.id,
      subject: 'Integration test',
      introLine1: null,
      introLine2: null,
      items: [
        {
          lineNo: 1,
          description: 'Rounded item',
          qty: 1.25,
          unitPrice: 10.02,
        },
        {
          lineNo: 2,
          description: 'Second item',
          qty: 2,
          unitPrice: 3.33,
        },
      ],
    })

    const fetched = await quotationRepository.findById(createdQuotation.id)
    const recent = await quotationRepository.listRecent()

    expect(fetched.grandTotal).toBe(19.19)
    expect(recent.some((quotation) => quotation.id === createdQuotation?.id)).toBe(
      true,
    )
    expect(fetched.items.map((item) => item.totalPrice)).toEqual([12.53, 6.66])
    expect(fetched.items.map((item) => item.lineNo)).toEqual([1, 2])
    expect(fetched.clientName).toBe("McDonald's")
    expect(fetched.region).toBe('Integration Region')

    createdQuotation = await quotationRepository.markPdfGenerated(
      createdQuotation.id,
    )
    expect(createdQuotation.status).toBe('PDF_GENERATED')
    expect(createdQuotation.pdfGeneratedAt).toBeTruthy()

    createdQuotation = await quotationRepository.markTransferred(
      createdQuotation.id,
    )
    expect(createdQuotation.status).toBe('TRANSFERRED')
    expect(createdQuotation.transferredAt).toBeTruthy()
  }, 20_000)
})
