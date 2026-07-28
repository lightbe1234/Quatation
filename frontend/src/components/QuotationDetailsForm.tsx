import type { QuotationDraft } from '../types/quotation'
import type { Store } from '../types/store'

type QuotationDetailsFormProps = {
  draft: QuotationDraft
  disabled: boolean
  selectedStore?: Store
  stores: Store[]
  onChange: (field: keyof Omit<QuotationDraft, 'items'>, value: string) => void
}

const inputClassName =
  'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-bms-blue focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500'

export function QuotationDetailsForm({
  draft,
  disabled,
  selectedStore,
  stores,
  onChange,
}: QuotationDetailsFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Branch <span className="text-red-600">*</span>
          <select
            className={inputClassName}
            disabled={disabled}
            onChange={(event) => onChange('storeId', event.target.value)}
            required
            value={draft.storeId}
          >
            <option value="">Select a branch</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {[
                  store.branch,
                  store.branchId,
                  store.contactName,
                ].filter(Boolean).join(' - ')}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Date <span className="text-red-600">*</span>
          <input
            className={inputClassName}
            disabled={disabled}
            onChange={(event) => onChange('quoteDate', event.target.value)}
            required
            type="date"
            value={draft.quoteDate}
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Job #
          <input
            className={inputClassName}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onChange('jobNo', event.target.value)}
            value={draft.jobNo}
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          QTN # <span className="text-red-600">*</span>
          <input
            className={inputClassName}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onChange('qtnNo', event.target.value)}
            required
            value={draft.qtnNo}
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Unit
          <input
            className={inputClassName}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onChange('unit', event.target.value)}
            value={draft.unit}
          />
        </label>

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Client Name <span className="text-red-600">*</span>
          <input
            className={inputClassName}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onChange('clientName', event.target.value)}
            placeholder="For example, McDonald's"
            required
            value={draft.clientName}
          />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            Enter this for each quotation. It will be written to Excel cell B15.
          </span>
        </label>

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Region <span className="text-red-600">*</span>
          <input
            className={inputClassName}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onChange('region', event.target.value)}
            placeholder="For example, North Region"
            required
            value={draft.region}
          />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            Enter this for each quotation. It will be written to Excel cell C17.
          </span>
        </label>

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Subject
          <input
            className={inputClassName}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onChange('subject', event.target.value)}
            value={draft.subject}
          />
        </label>

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Intro line 1
          <textarea
            className={inputClassName}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onChange('introLine1', event.target.value)}
            rows={2}
            value={draft.introLine1}
          />
        </label>

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Intro line 2
          <textarea
            className={inputClassName}
            disabled={disabled}
            maxLength={500}
            onChange={(event) => onChange('introLine2', event.target.value)}
            rows={2}
            value={draft.introLine2}
          />
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Auto-filled store details
        </p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          {[
            ['Branch', selectedStore?.branch],
            ['Branch ID', selectedStore?.branchId],
            ['Mr./Ms.', selectedStore?.contactName],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-1 font-medium text-slate-800">{value || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
