import { describe, expect, it } from 'vitest'
import {
  calculateGrandTotal,
  calculateLineTotal,
} from './quotationTotals.js'

describe('quotation totals', () => {
  it('rounds each line half-up to two decimals', () => {
    expect(calculateLineTotal(1.25, 10.02)).toBe(12.53)
  })

  it('adds the rounded line totals', () => {
    expect(
      calculateGrandTotal([
        { lineNo: 1, description: 'First', qty: 1.25, unitPrice: 10.02 },
        { lineNo: 2, description: 'Second', qty: 2, unitPrice: 3.33 },
      ]),
    ).toBe(19.19)
  })
})
