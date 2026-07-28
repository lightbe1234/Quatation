export const firstQuotationItemRow = 26
export const lastQuotationTableRow = 38
export const maxQuotationItemCount = 12

export const quotationBorderSides = [
  'EdgeTop',
  'EdgeBottom',
  'EdgeLeft',
  'EdgeRight',
  'InsideVertical',
  'InsideHorizontal',
] as const

export type QuotationTableLayout = {
  itemRange: string
  resetRange: string
  totalRange: string
  totalRow: number
  unusedRange?: string
}

export type QuotationItemRowFormatting = {
  itemRange: string
  serialRange: string
  descriptionRange: string
  quantityRange: string
  unitPriceRange: string
  totalPriceRange: string
  autofitRange: string
}

export function buildQuotationTableLayout(
  itemCount: number,
): QuotationTableLayout {
  if (
    !Number.isInteger(itemCount) ||
    itemCount < 1 ||
    itemCount > maxQuotationItemCount
  ) {
    throw new Error(
      `Quotation item count must be between 1 and ${maxQuotationItemCount}`,
    )
  }

  const lastItemRow = firstQuotationItemRow + itemCount - 1
  const totalRow = lastItemRow + 1

  return {
    itemRange: `A${firstQuotationItemRow}:H${lastItemRow}`,
    resetRange: `A${firstQuotationItemRow}:H${lastQuotationTableRow}`,
    totalRange: `A${totalRow}:H${totalRow}`,
    totalRow,
    unusedRange:
      totalRow < lastQuotationTableRow
        ? `A${totalRow + 1}:H${lastQuotationTableRow}`
        : undefined,
  }
}

export function buildQuotationItemRowFormatting(
  itemCount: number,
): QuotationItemRowFormatting {
  const layout = buildQuotationTableLayout(itemCount)
  const lastItemRow = layout.totalRow - 1

  return {
    itemRange: layout.itemRange,
    serialRange: `A${firstQuotationItemRow}:A${lastItemRow}`,
    descriptionRange: `B${firstQuotationItemRow}:B${lastItemRow}`,
    quantityRange: `F${firstQuotationItemRow}:F${lastItemRow}`,
    unitPriceRange: `G${firstQuotationItemRow}:G${lastItemRow}`,
    totalPriceRange: `H${firstQuotationItemRow}:H${lastItemRow}`,
    autofitRange: layout.itemRange,
  }
}
