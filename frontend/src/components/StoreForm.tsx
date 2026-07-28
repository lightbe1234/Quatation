import { useState, type FormEvent } from 'react'
import type { Store, StoreInput } from '../types/store'
import { Button } from './ui'

type StoreFormProps = {
  store?: Store
  isSaving: boolean
  onCancel: () => void
  onSave: (input: StoreInput) => Promise<void>
}

function initialValues(store?: Store): StoreInput {
  return {
    storeNo: store?.branchId ?? '',
    storeName: store?.branch ?? '',
    contactName: store?.contactName ?? '',
    branch: store?.branch ?? '',
    branchId: store?.branchId ?? '',
    region: null,
    clientName: null,
  }
}

export function StoreForm({
  store,
  isSaving,
  onCancel,
  onSave,
}: StoreFormProps) {
  const [values, setValues] = useState(() => initialValues(store))

  function updateField(field: keyof StoreInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSave({
      ...values,
      storeNo: values.branchId ?? '',
      storeName: values.branch ?? '',
      region: null,
      clientName: null,
    })
  }

  const inputClassName =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-bms-blue focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100'

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Branch <span className="text-red-600">*</span>
          <input
            className={inputClassName}
            disabled={isSaving}
            maxLength={200}
            onChange={(event) => updateField('branch', event.target.value)}
            required
            value={values.branch ?? ''}
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Branch ID <span className="text-red-600">*</span>
          <input
            className={inputClassName}
            disabled={isSaving}
            maxLength={200}
            onChange={(event) => updateField('branchId', event.target.value)}
            required
            value={values.branchId ?? ''}
          />
        </label>

        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Mr./Ms.
          <input
            className={inputClassName}
            disabled={isSaving}
            maxLength={200}
            onChange={(event) => updateField('contactName', event.target.value)}
            value={values.contactName ?? ''}
          />
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        {store && (
          <Button
            disabled={isSaving}
            onClick={onCancel}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        )}
        <Button
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Saving store...' : store ? 'Save changes' : 'Add store'}
        </Button>
      </div>
    </form>
  )
}
