import { Decimal } from 'decimal.js'
import type { QuotationLineDraft } from '../types/quotation'

Decimal.set({ precision: 24, rounding: Decimal.ROUND_HALF_UP })

function parseAmount(value: string) {
  if (!value.trim()) {
    return new Decimal(0)
  }

  try {
    return new Decimal(value)
  } catch {
    return new Decimal(0)
  }
}

export function calculateLineTotal(item: QuotationLineDraft) {
  return parseAmount(item.qty)
    .times(parseAmount(item.unitPrice))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber()
}

export function calculateGrandTotal(items: QuotationLineDraft[]) {
  return items
    .reduce(
      (total, item) => total.plus(calculateLineTotal(item)),
      new Decimal(0),
    )
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber()
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
