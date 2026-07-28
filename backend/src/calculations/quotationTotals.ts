import { Decimal } from 'decimal.js'
import type { QuotationItemInput } from '../types/quotation.js'

Decimal.set({ precision: 24, rounding: Decimal.ROUND_HALF_UP })

export function calculateLineTotal(quantity: number, unitPrice: number) {
  return new Decimal(quantity)
    .times(unitPrice)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber()
}

export function calculateGrandTotal(items: QuotationItemInput[]) {
  return items
    .reduce(
      (total, item) =>
        total.plus(calculateLineTotal(item.qty, item.unitPrice)),
      new Decimal(0),
    )
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber()
}
