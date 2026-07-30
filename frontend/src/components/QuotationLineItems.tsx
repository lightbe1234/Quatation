import { memo } from 'react'
import { calculateLineTotal, formatAmount } from '../calculations/quotationTotals'
import type { QuotationLineDraft } from '../types/quotation'

type QuotationLineItemsProps = {
  disabled: boolean
  items: QuotationLineDraft[]
  onAdd: () => void
  onChange: (
    id: string,
    field: keyof Omit<QuotationLineDraft, 'id'>,
    value: string,
  ) => void
  onRemove: (id: string) => void
}

const numberInputClassName =
  'h-10 w-24 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-bms-blue focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100'

export const QuotationLineItems = memo(function QuotationLineItems({
  disabled,
  items,
  onAdd,
  onChange,
  onRemove,
}: QuotationLineItemsProps) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Line items</h3>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} of 12 item rows used
          </p>
        </div>
        <button
          className="rounded-lg border border-bms-blue px-4 py-2 text-sm font-semibold text-bms-blue hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          disabled={disabled || items.length >= 12}
          onClick={onAdd}
          type="button"
        >
          + Add Line
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            key={item.id}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Line {index + 1} / Excel row {26 + index}
              </span>
              <button
                className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:text-slate-300"
                disabled={disabled || items.length === 1}
                onClick={() => onRemove(item.id)}
                type="button"
              >
                Remove
              </button>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Description <span className="text-red-600">*</span>
              <textarea
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-bms-blue focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                disabled={disabled}
                maxLength={500}
                onChange={(event) =>
                  onChange(item.id, 'description', event.target.value)
                }
                required
                rows={2}
                value={item.description}
              />
            </label>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium text-slate-700">
                Qty
                <input
                  className={numberInputClassName}
                  disabled={disabled}
                  min="0.01"
                  onChange={(event) =>
                    onChange(item.id, 'qty', event.target.value)
                  }
                  required
                  step="0.01"
                  type="number"
                  value={item.qty}
                />
              </label>

              <span className="pb-2 text-slate-400">x</span>

              <label className="text-sm font-medium text-slate-700">
                Unit Price
                <input
                  className={numberInputClassName}
                  disabled={disabled}
                  min="0"
                  onChange={(event) =>
                    onChange(item.id, 'unitPrice', event.target.value)
                  }
                  required
                  step="0.01"
                  type="number"
                  value={item.unitPrice}
                />
              </label>

              <span className="pb-2 text-slate-400">=</span>

              <div className="min-w-28 pb-1 text-right">
                <p className="text-xs text-slate-500">Line total</p>
                <p className="mt-1 font-semibold tabular-nums text-slate-950">
                  {formatAmount(calculateLineTotal(item))}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length >= 12 && (
        <p className="mt-3 text-sm font-medium text-amber-700">
          Maximum reached: Excel rows 26 through 37 allow 12 items.
        </p>
      )}
    </div>
  )
})
