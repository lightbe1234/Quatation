import type { Store } from '../types/store'
import { EmptyState } from './ui'

type StoreTableProps = {
  deletingId: string | null
  stores: Store[]
  onDelete: (store: Store) => void
  onEdit: (store: Store) => void
}

export function StoreTable({
  deletingId,
  stores,
  onDelete,
  onEdit,
}: StoreTableProps) {
  if (stores.length === 0) {
    return (
      <EmptyState
        description="Use the form on this page to add your first service outlet."
        icon={
          <svg
            aria-hidden="true"
            className="size-7"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 20V8.5L12 4l8 4.5V20"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
            <path
              d="M9 20v-6h6v6M7.5 10.5h.01M12 10.5h.01M16.5 10.5h.01"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        }
        title="No stores added yet"
      />
    )
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[34rem] table-fixed divide-y divide-slate-200 text-left text-sm">
        <colgroup>
          <col className="w-[32%]" />
          <col className="w-[22%]" />
          <col className="w-[26%]" />
          <col className="w-[20%]" />
        </colgroup>
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold" scope="col">
              Branch
            </th>
            <th className="px-4 py-3 font-semibold" scope="col">
              Branch ID
            </th>
            <th className="px-4 py-3 font-semibold" scope="col">
              Mr./Ms.
            </th>
            <th className="px-4 py-3 text-right font-semibold" scope="col">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {stores.map((store) => (
            <tr
              className="transition-colors hover:bg-blue-50/40"
              key={store.id}
            >
              <td className="px-4 py-3">
                <p className="break-words font-semibold text-slate-950">
                  {store.branch || '-'}
                </p>
              </td>
              <td className="break-words px-4 py-3 text-slate-600">
                {store.branchId || '-'}
              </td>
              <td className="break-words px-4 py-3 text-slate-600">
                {store.contactName || '-'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  className="font-semibold text-bms-blue hover:text-blue-900"
                  onClick={() => onEdit(store)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="ml-4 font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={deletingId === store.id}
                  onClick={() => onDelete(store)}
                  type="button"
                >
                  {deletingId === store.id ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
