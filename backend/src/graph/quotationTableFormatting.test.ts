import { describe, expect, it } from 'vitest'
import {
  buildQuotationItemRowFormatting,
  buildQuotationTableLayout,
} from './quotationTableFormatting.js'

describe('quotation table formatting layout', () => {
  it.each([
    {
      itemCount: 1,
      itemRange: 'A26:H26',
      totalRange: 'A27:H27',
      unusedRange: 'A28:H38',
    },
    {
      itemCount: 3,
      itemRange: 'A26:H28',
      totalRange: 'A29:H29',
      unusedRange: 'A30:H38',
    },
    {
      itemCount: 12,
      itemRange: 'A26:H37',
      totalRange: 'A38:H38',
      unusedRange: undefined,
    },
  ])(
    'positions borders and TOTAL after $itemCount item(s)',
    ({ itemCount, itemRange, totalRange, unusedRange }) => {
      expect(buildQuotationTableLayout(itemCount)).toEqual({
        itemRange,
        resetRange: 'A26:H38',
        totalRange,
        totalRow: 26 + itemCount,
        unusedRange,
      })
    },
  )

  it.each([
    {
      itemCount: 1,
      serialRange: 'A26:A26',
      descriptionRange: 'B26:B26',
      quantityRange: 'F26:F26',
      unitPriceRange: 'G26:G26',
      totalPriceRange: 'H26:H26',
      autofitRange: 'A26:H26',
    },
    {
      itemCount: 3,
      serialRange: 'A26:A28',
      descriptionRange: 'B26:B28',
      quantityRange: 'F26:F28',
      unitPriceRange: 'G26:G28',
      totalPriceRange: 'H26:H28',
      autofitRange: 'A26:H28',
    },
    {
      itemCount: 12,
      serialRange: 'A26:A37',
      descriptionRange: 'B26:B37',
      quantityRange: 'F26:F37',
      unitPriceRange: 'G26:G37',
      totalPriceRange: 'H26:H37',
      autofitRange: 'A26:H37',
    },
  ])(
    'targets the row-format ranges for $itemCount item(s)',
    ({
      itemCount,
      serialRange,
      descriptionRange,
      quantityRange,
      unitPriceRange,
      totalPriceRange,
      autofitRange,
    }) => {
      expect(buildQuotationItemRowFormatting(itemCount)).toEqual({
        itemRange: `A26:H${25 + itemCount}`,
        serialRange,
        descriptionRange,
        quantityRange,
        unitPriceRange,
        totalPriceRange,
        autofitRange,
      })
    },
  )
})
