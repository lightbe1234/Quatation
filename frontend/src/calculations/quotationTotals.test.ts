import { describe, expect, it } from 'vitest'
import {
  calculateGrandTotal,
  calculateLineTotal,
} from './quotationTotals'

describe('live quotation totals', () => {
  const firstItem = {
    id: 'first',
    description: 'First item',
    qty: '1.25',
    unitPrice: '10.02',
  }

  it('rounds a line total half-up to two decimals', () => {
    expect(calculateLineTotal(firstItem)).toBe(12.53)
  })

  it('adds rounded line totals for the preview grand total', () => {
    expect(
      calculateGrandTotal([
        firstItem,
        {
          id: 'second',
          description: 'Second item',
          qty: '2',
          unitPrice: '3.33',
        },
      ]),
    ).toBe(19.19)
  })
})
