import { useEffect, useState } from 'react'
import {
  createStore,
  deleteStore,
  listStores,
  updateStore,
} from '../api/stores'
import { StoreForm } from '../components/StoreForm'
import { StoreTable } from '../components/StoreTable'
import { Card, PageHeader, StatusMessage, TwoColumnLayout } from '../components/ui'
import type { Store, StoreInput } from '../types/store'

function sortStores(stores: Store[]) {
  return [...stores].sort((first, second) =>
    (first.branch ?? '').localeCompare(second.branch ?? ''),
  )
}

export function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [editingStore, setEditingStore] = useState<Store>()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const controller = new AbortController()

    listStores(controller.signal)
      .then((loadedStores) => {
        setStores(loadedStores)
        setError(undefined)
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message)
        }
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [])

  async function handleSave(input: StoreInput) {
    setIsSaving(true)
    setError(undefined)
    setMessage(undefined)

    try {
      if (editingStore) {
        const updated = await updateStore(editingStore.id, input)
        setStores((current) =>
          sortStores(
            current.map((store) => (store.id === updated.id ? updated : store)),
          ),
        )
        setEditingStore(undefined)
        setMessage('Store updated successfully.')
      } else {
        const created = await createStore(input)
        setStores((current) => sortStores([...current, created]))
        setMessage('Store added successfully.')
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The store could not be saved',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(store: Store) {
    const confirmed = window.confirm(
      `Delete branch ${store.branch ?? '-'} (${store.branchId ?? '-'})? This cannot be undone.`,
    )

    if (!confirmed) {
      return
    }

    setDeletingId(store.id)
    setError(undefined)
    setMessage(undefined)

    try {
      await deleteStore(store.id)
      setStores((current) =>
        current.filter((currentStore) => currentStore.id !== store.id),
      )
      if (editingStore?.id === store.id) {
        setEditingStore(undefined)
      }
      setMessage('Store deleted successfully.')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The store could not be deleted',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Store details entered here will auto-fill future quotation forms."
        eyebrow="Store directory"
        title="Manage service outlets"
      />

      {(message || error) && (
        <StatusMessage tone={error ? 'error' : 'success'}>
          {error ?? message}
        </StatusMessage>
      )}

      <TwoColumnLayout
        main={
          <Card className="overflow-hidden" padded={false}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-950">Saved stores</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {stores.length} {stores.length === 1 ? 'store' : 'stores'}
                </p>
              </div>
            </div>

            {isLoading ? (
              <p className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                Loading stores...
              </p>
            ) : (
              <StoreTable
                deletingId={deletingId}
                onDelete={handleDelete}
                onEdit={(store) => {
                  setEditingStore(store)
                  setMessage(undefined)
                  setError(undefined)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                stores={stores}
              />
            )}
          </Card>
        }
        aside={
          <Card aria-busy={isSaving}>
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-950">
              {editingStore
                ? `Edit ${editingStore.branch ?? 'branch'}`
                : 'Add a new store'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Branch and Branch ID are required.
            </p>
          </div>
          <StoreForm
            isSaving={isSaving}
            key={editingStore?.id ?? `new-${stores.length}`}
            onCancel={() => setEditingStore(undefined)}
            onSave={handleSave}
            store={editingStore}
          />
          </Card>
        }
      />
    </div>
  )
}
