import { useEffect, useState } from 'react'
import {
  createQuotationFieldOption,
  deleteQuotationFieldOption,
  listQuotationFieldOptions,
  updateQuotationFieldOption,
} from '../api/settings'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SettingsOptionSection } from '../components/SettingsOptionSection'
import { Card, PageHeader, StatusMessage } from '../components/ui'
import {
  quotationFieldDefinitions,
  type QuotationFieldOption,
  type QuotationFieldOptionInput,
} from '../types/settings'

function sortOptions(options: QuotationFieldOption[]) {
  const fieldOrder = new Map(
    quotationFieldDefinitions.map((field, index) => [field.key, index]),
  )

  return [...options].sort(
    (first, second) =>
      (fieldOrder.get(first.fieldKey) ?? 0) -
        (fieldOrder.get(second.fieldKey) ?? 0) ||
      first.sortOrder - second.sortOrder ||
      first.optionValue.localeCompare(second.optionValue),
  )
}

export function SettingsPage() {
  const [options, setOptions] = useState<QuotationFieldOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const controller = new AbortController()

    listQuotationFieldOptions(controller.signal)
      .then((loadedOptions) => setOptions(sortOptions(loadedOptions)))
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message)
        }
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [])

  async function handleAdd(input: QuotationFieldOptionInput) {
    setBusyAction(`add:${input.fieldKey}`)
    setMessage(undefined)
    setError(undefined)

    try {
      const created = await createQuotationFieldOption(input)
      setOptions((current) => sortOptions([...current, created]))
      setMessage(`${created.optionValue} added to ${input.fieldKey}.`)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The option could not be added',
      )
      throw requestError
    } finally {
      setBusyAction(undefined)
    }
  }

  async function handleUpdate(
    id: string,
    input: QuotationFieldOptionInput,
  ) {
    setBusyAction(`update:${id}`)
    setMessage(undefined)
    setError(undefined)

    try {
      const updated = await updateQuotationFieldOption(id, input)
      setOptions((current) =>
        sortOptions(
          current.map((option) => (option.id === id ? updated : option)),
        ),
      )
      setMessage(`${updated.optionValue} updated successfully.`)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The option could not be updated',
      )
      throw requestError
    } finally {
      setBusyAction(undefined)
    }
  }

  async function handleDelete(option: QuotationFieldOption) {
    const confirmed = window.confirm(
      `Delete "${option.optionValue}" from ${option.fieldKey}? It will no longer be available on new quotations.`,
    )
    if (!confirmed) {
      return
    }

    setBusyAction(`delete:${option.id}`)
    setMessage(undefined)
    setError(undefined)

    try {
      await deleteQuotationFieldOption(option.id)
      setOptions((current) =>
        current.filter((currentOption) => currentOption.id !== option.id),
      )
      setMessage(`${option.optionValue} deleted successfully.`)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The option could not be deleted',
      )
      throw requestError
    } finally {
      setBusyAction(undefined)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Manage the reusable dropdown values available when preparing a new quotation."
        eyebrow="Admin configuration"
        title="Settings"
      />

      {(message || error) && (
        <StatusMessage tone={error ? 'error' : 'success'}>
          {error ?? message}
        </StatusMessage>
      )}

      {isLoading ? (
        <Card>
          <div
            className="flex items-center justify-center gap-3 py-10 text-sm font-medium text-slate-600"
            role="status"
          >
            <LoadingSpinner className="size-5" />
            Loading quotation settings...
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {quotationFieldDefinitions.map((field) => (
            <SettingsOptionSection
              field={field}
              isBusy={Boolean(busyAction)}
              key={field.key}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              options={options.filter(
                (option) => option.fieldKey === field.key,
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
