import { useState, type FormEvent } from 'react'
import type {
  QuotationFieldKey,
  QuotationFieldOption,
  QuotationFieldOptionInput,
} from '../types/settings'
import { Button, Card } from './ui'

type SettingsOptionSectionProps = {
  field: {
    key: QuotationFieldKey
    label: string
    required: boolean
  }
  isBusy: boolean
  options: QuotationFieldOption[]
  onAdd: (input: QuotationFieldOptionInput) => Promise<void>
  onDelete: (option: QuotationFieldOption) => Promise<void>
  onUpdate: (
    id: string,
    input: QuotationFieldOptionInput,
  ) => Promise<void>
}

const inputClassName =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-950 outline-none transition focus:border-bms-blue focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100'

export function SettingsOptionSection({
  field,
  isBusy,
  options,
  onAdd,
  onDelete,
  onUpdate,
}: SettingsOptionSectionProps) {
  const [newValue, setNewValue] = useState('')
  const [newSortOrder, setNewSortOrder] = useState('0')
  const [editingId, setEditingId] = useState<string>()
  const [editValue, setEditValue] = useState('')
  const [editSortOrder, setEditSortOrder] = useState('0')

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newValue.trim()) {
      return
    }

    try {
      await onAdd({
        fieldKey: field.key,
        optionValue: newValue,
        sortOrder: Number(newSortOrder),
      })
      setNewValue('')
      setNewSortOrder(String(options.length + 1))
    } catch {
      // The parent renders the API error while preserving this input.
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingId || !editValue.trim()) {
      return
    }

    try {
      await onUpdate(editingId, {
        fieldKey: field.key,
        optionValue: editValue,
        sortOrder: Number(editSortOrder),
      })
      setEditingId(undefined)
    } catch {
      // The parent renders the API error while preserving the edit.
    }
  }

  return (
    <Card className="flex min-h-72 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{field.label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Values appear in this order on New Quotation.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${
            field.required
              ? 'bg-blue-50 text-bms-blue'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {field.required ? 'Required' : 'Optional'}
        </span>
      </div>

      <div className="mt-4 flex-1">
        {options.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs leading-5 text-slate-500">
            No {field.label} options configured yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {options.map((option) => (
              <li className="px-3 py-2.5" key={option.id}>
                {editingId === option.id ? (
                  <form
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_auto]"
                    onSubmit={handleUpdate}
                  >
                    <label className="sr-only" htmlFor={`edit-value-${option.id}`}>
                      Edit {field.label} value
                    </label>
                    <input
                      className={inputClassName}
                      disabled={isBusy}
                      id={`edit-value-${option.id}`}
                      maxLength={500}
                      onChange={(event) => setEditValue(event.target.value)}
                      required
                      value={editValue}
                    />
                    <label className="sr-only" htmlFor={`edit-order-${option.id}`}>
                      Edit {field.label} sort order
                    </label>
                    <input
                      className={inputClassName}
                      disabled={isBusy}
                      id={`edit-order-${option.id}`}
                      min="0"
                      onChange={(event) => setEditSortOrder(event.target.value)}
                      required
                      type="number"
                      value={editSortOrder}
                    />
                    <div className="flex gap-1.5">
                      <Button
                        className="min-h-9 px-2.5 py-1.5 text-xs"
                        disabled={isBusy}
                        type="submit"
                      >
                        Save
                      </Button>
                      <Button
                        className="min-h-9 px-2.5 py-1.5 text-xs"
                        disabled={isBusy}
                        onClick={() => setEditingId(undefined)}
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-slate-800">
                        {option.optionValue}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Order {option.sortOrder}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        aria-label={`Edit ${field.label} option ${option.optionValue}`}
                        className="text-xs font-semibold text-bms-blue hover:text-blue-900 disabled:text-slate-400"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingId(option.id)
                          setEditValue(option.optionValue)
                          setEditSortOrder(String(option.sortOrder))
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Delete ${field.label} option ${option.optionValue}`}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:text-slate-400"
                        disabled={isBusy}
                        onClick={() => void onDelete(option)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="mt-4 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-[minmax(0,1fr)_5rem_auto]"
        onSubmit={handleAdd}
      >
        <label className="sr-only" htmlFor={`new-value-${field.key}`}>
          Add {field.label} value
        </label>
        <input
          className={inputClassName}
          disabled={isBusy}
          id={`new-value-${field.key}`}
          maxLength={500}
          onChange={(event) => setNewValue(event.target.value)}
          placeholder={`New ${field.label} value`}
          required
          value={newValue}
        />
        <label className="sr-only" htmlFor={`new-order-${field.key}`}>
          Add {field.label} sort order
        </label>
        <input
          className={inputClassName}
          disabled={isBusy}
          id={`new-order-${field.key}`}
          min="0"
          onChange={(event) => setNewSortOrder(event.target.value)}
          required
          type="number"
          value={newSortOrder}
        />
        <Button
          className="min-h-9 px-3 py-1.5 text-xs"
          disabled={isBusy}
          type="submit"
        >
          Add
        </Button>
      </form>
    </Card>
  )
}
