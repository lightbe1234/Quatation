import { Link } from 'react-router-dom'
import type { QuotationDraft } from '../types/quotation'
import type {
  QuotationFieldKey,
  QuotationFieldOption,
} from '../types/settings'
import type { Store } from '../types/store'

type QuotationDetailsFormProps = {
  draft: QuotationDraft
  disabled: boolean
  selectedStore?: Store
  stores: Store[]
  fieldOptions: QuotationFieldOption[]
  isLoadingFieldOptions: boolean
  fieldOptionsError?: string
  onChange: (field: keyof Omit<QuotationDraft, 'items'>, value: string) => void
}

const inputClassName =
  'mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-bms-blue focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500'

type ConfiguredSelectProps = {
  className?: string
  disabled: boolean
  fieldKey: QuotationFieldKey
  fieldOptions: QuotationFieldOption[]
  helpText?: string
  isLoading: boolean
  loadError?: string
  label: string
  onChange: (value: string) => void
  required?: boolean
  value: string
}

function ConfiguredSelect({
  className,
  disabled,
  fieldKey,
  fieldOptions,
  helpText,
  isLoading,
  loadError,
  label,
  onChange,
  required = false,
  value,
}: ConfiguredSelectProps) {
  const options = fieldOptions.filter(
    (option) => option.fieldKey === fieldKey,
  )
  const hasOptions = options.length > 0
  const hasCurrentValue = options.some(
    (option) => option.optionValue === value,
  )
  const isUnavailable = Boolean(loadError) || (!isLoading && !hasOptions)

  return (
    <label
      className={`text-sm font-medium text-slate-700 ${className ?? ''}`}
    >
      {label} {required && <span className="text-red-600">*</span>}
      <select
        className={inputClassName}
        disabled={disabled || isLoading || isUnavailable}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        <option value="">
          {isLoading
            ? `Loading ${label} options...`
            : loadError
              ? `${label} options unavailable`
              : hasOptions
                ? `Select ${label}`
                : `No ${label} options configured`}
        </option>
        {value && !hasCurrentValue && (
          <option value={value}>{value} (current draft)</option>
        )}
        {options.map((option) => (
          <option key={option.id} value={option.optionValue}>
            {option.optionValue}
          </option>
        ))}
      </select>
      {!isLoading && required && isUnavailable && (
        <span className="mt-1.5 block rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-medium leading-5 text-amber-800">
          {loadError
            ? `${label} options could not be loaded.`
            : `No ${label} options configured yet.`}{' '}
          <Link className="font-bold underline" to="/settings">
            Add one in Settings
          </Link>
          .
        </span>
      )}
      {helpText && (
        <span className="mt-1.5 block text-xs font-normal text-slate-500">
          {helpText}
        </span>
      )}
    </label>
  )
}

export function QuotationDetailsForm({
  draft,
  disabled,
  fieldOptions,
  fieldOptionsError,
  isLoadingFieldOptions,
  selectedStore,
  stores,
  onChange,
}: QuotationDetailsFormProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
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

        <ConfiguredSelect
          disabled={disabled}
          fieldKey="job_no"
          fieldOptions={fieldOptions}
          isLoading={isLoadingFieldOptions}
          label="Job #"
          loadError={fieldOptionsError}
          onChange={(value) => onChange('jobNo', value)}
          value={draft.jobNo}
        />

        <ConfiguredSelect
          disabled={disabled}
          fieldKey="qtn_no"
          fieldOptions={fieldOptions}
          isLoading={isLoadingFieldOptions}
          label="QTN #"
          loadError={fieldOptionsError}
          onChange={(value) => onChange('qtnNo', value)}
          required
          value={draft.qtnNo}
        />

        <ConfiguredSelect
          disabled={disabled}
          fieldKey="unit"
          fieldOptions={fieldOptions}
          isLoading={isLoadingFieldOptions}
          label="Unit"
          loadError={fieldOptionsError}
          onChange={(value) => onChange('unit', value)}
          value={draft.unit}
        />

        <ConfiguredSelect
          className="sm:col-span-2"
          disabled={disabled}
          fieldKey="client_name"
          fieldOptions={fieldOptions}
          helpText="The selected value keeps the existing Excel mapping to cell B15."
          isLoading={isLoadingFieldOptions}
          label="Client Name"
          loadError={fieldOptionsError}
          onChange={(value) => onChange('clientName', value)}
          required
          value={draft.clientName}
        />

        <ConfiguredSelect
          className="sm:col-span-2"
          disabled={disabled}
          fieldKey="region"
          fieldOptions={fieldOptions}
          helpText="The selected value keeps the existing Excel mapping to cell C17."
          isLoading={isLoadingFieldOptions}
          label="Region"
          loadError={fieldOptionsError}
          onChange={(value) => onChange('region', value)}
          required
          value={draft.region}
        />

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

        <ConfiguredSelect
          className="sm:col-span-2"
          disabled={disabled}
          fieldKey="intro_line_1"
          fieldOptions={fieldOptions}
          isLoading={isLoadingFieldOptions}
          label="Intro line 1"
          loadError={fieldOptionsError}
          onChange={(value) => onChange('introLine1', value)}
          value={draft.introLine1}
        />

        <ConfiguredSelect
          className="sm:col-span-2"
          disabled={disabled}
          fieldKey="intro_line_2"
          fieldOptions={fieldOptions}
          isLoading={isLoadingFieldOptions}
          label="Intro line 2"
          loadError={fieldOptionsError}
          onChange={(value) => onChange('introLine2', value)}
          value={draft.introLine2}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Auto-filled store details
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
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
