import { describe, expect, it } from 'vitest'
import { findQuotationWriteMismatch } from './quotationWriteVerification.js'

describe('quotation write verification', () => {
  const writes = [
    {
      address: 'H9:H10',
      values: [[46_226], ['JOB-1']],
    },
    {
      address: 'B15',
      values: [['Client']],
    },
    {
      address: 'F26:H26',
      values: [[2, 10, 20]],
    },
  ]

  it('verifies separate writes from one consolidated worksheet read', () => {
    const values = Array.from({ length: 18 }, () =>
      Array.from({ length: 8 }, () => ''),
    )
    values[0][7] = 46_226
    values[1][7] = 'JOB-1'
    values[6][1] = 'Client'
    values[17][5] = 2
    values[17][6] = 10
    values[17][7] = 20

    expect(findQuotationWriteMismatch(writes, values)).toBeUndefined()
  })

  it('identifies the write containing a stale value', () => {
    const values = Array.from({ length: 18 }, () =>
      Array.from({ length: 8 }, () => ''),
    )

    expect(findQuotationWriteMismatch(writes, values)).toBe('H9:H10')
  })
})
