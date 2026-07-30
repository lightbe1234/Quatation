import { useEffect, useState } from 'react'
import {
  deleteRecordRow,
  getRecords,
  updateRecordRow,
  type RecordCell,
  type WorkbookRecordGrid,
  type WorkbookRecords,
} from '../api/records'
import { LoadingSpinner } from '../components/LoadingSpinner'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatusMessage,
} from '../components/ui'

type EditingRow = {
  rowNumber: number
  values: RecordCell[]
}

const numericColumns = new Set([8, 10, 11])

function displayCell(value: RecordCell) {
  return value === null ? '' : String(value)
}

export function RecordsPage() {
  const [records, setRecords] = useState<WorkbookRecords>()
  const [editingRow, setEditingRow] = useState<EditingRow>()
  const [isLoading, setIsLoading] = useState(true)
  const [savingRow, setSavingRow] = useState<number>()
  const [deletingRow, setDeletingRow] = useState<number>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  async function loadRecords(showMessage = false) {
    setIsLoading(true)
    setError(undefined)
    if (showMessage) {
      setMessage(undefined)
    }

    try {
      setRecords(await getRecords())
      if (showMessage) {
        setMessage('Financial Records refreshed from the live workbook.')
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Financial Records could not be loaded',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  function startEditing(rowNumber: number, values: RecordCell[]) {
    setEditingRow({
      rowNumber,
      values: values.map((value) => value ?? ''),
    })
    setError(undefined)
    setMessage(undefined)
  }

  function updateEditingCell(column: number, value: string) {
    setEditingRow((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        values: current.values.map((cell, index) =>
          index === column ? value : cell,
        ),
      }
    })
  }

  async function saveRow() {
    if (!editingRow) {
      return
    }

    const confirmed = window.confirm(
      `Update Financial Records row ${editingRow.rowNumber} in the live Excel workbook?`,
    )
    if (!confirmed) {
      return
    }

    setSavingRow(editingRow.rowNumber)
    setError(undefined)
    setMessage(undefined)

    try {
      const financial = await updateRecordRow(
        editingRow.rowNumber,
        editingRow.values,
      )
      setRecords({ financial })
      setMessage(`Financial Records row ${editingRow.rowNumber} updated.`)
      setEditingRow(undefined)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The Financial record could not be updated',
      )
    } finally {
      setSavingRow(undefined)
    }
  }

  async function removeRow(rowNumber: number) {
    const confirmed = window.confirm(
      `Delete Financial Records row ${rowNumber} from the live Excel workbook? This clears that exact Excel row and cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    setDeletingRow(rowNumber)
    setError(undefined)
    setMessage(undefined)

    try {
      const financial = await deleteRecordRow(rowNumber)
      setRecords({ financial })
      setMessage(`Financial Records row ${rowNumber} deleted.`)
      if (editingRow?.rowNumber === rowNumber) {
        setEditingRow(undefined)
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The Financial record could not be deleted',
      )
    } finally {
      setDeletingRow(undefined)
    }
  }

  const grid: WorkbookRecordGrid | undefined = records?.financial

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          description="Review and manage rows directly in the live Excel financial worksheet."
          eyebrow="Workbook records"
          title="Records"
        />
        <Button
          disabled={isLoading}
          onClick={() => void loadRecords(true)}
          type="button"
          variant="secondary"
        >
          {isLoading && <LoadingSpinner />}
          <span>{isLoading ? 'Loading records...' : 'Refresh records'}</span>
        </Button>
      </div>

      {(message || error) && (
        <StatusMessage tone={error ? 'error' : 'success'}>
          {error ?? message}
        </StatusMessage>
      )}

      <Card className="overflow-hidden" padded={false}>
        <div className="border-b border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            Live Excel worksheet
          </p>
          <h3 className="mt-1.5 text-lg font-bold text-slate-950">
            Financial Records
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            Rows currently stored in the live financial worksheet. Edit and
            delete actions require confirmation before Excel is changed.
          </p>
        </div>

        {isLoading && !grid ? (
          <div
            className="flex items-center justify-center gap-3 px-5 py-10 text-sm font-medium text-slate-600"
            role="status"
          >
            <LoadingSpinner className="size-5" />
            Loading live Financial Records...
          </div>
        ) : grid && grid.rows.length > 0 ? (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[88rem] table-fixed divide-y divide-slate-200 text-left text-xs">
              <colgroup>
                <col className="w-14" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-24" />
                <col className="w-40" />
                <col className="w-24" />
                <col className="w-16" />
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-36" />
              </colgroup>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2.5 py-3 text-[0.7rem] font-bold uppercase leading-4 tracking-wide text-slate-500">
                    Excel row
                  </th>
                  {grid.headers.map((header, index) => (
                    <th
                      className="px-2.5 py-3 text-[0.7rem] font-bold uppercase leading-4 tracking-wide text-slate-500"
                      key={`${displayCell(header)}-${index}`}
                    >
                      {displayCell(header)}
                    </th>
                  ))}
                  <th className="sticky right-0 z-10 border-l border-slate-200 bg-slate-50 px-2.5 py-3 text-[0.7rem] font-bold uppercase leading-4 tracking-wide text-slate-500 shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.45)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {grid.rows.map((row) => {
                  const isEditing = editingRow?.rowNumber === row.rowNumber
                  const isBusy =
                    savingRow === row.rowNumber ||
                    deletingRow === row.rowNumber

                  return (
                    <tr key={row.rowNumber}>
                      <td className="px-2.5 py-3 align-top font-mono text-[0.7rem] font-bold text-slate-500">
                        {row.rowNumber}
                      </td>
                      {row.values.map((value, column) => (
                        <td
                          className={`px-2.5 py-3 align-top leading-5 text-slate-700 ${
                            numericColumns.has(column) ? 'text-right tabular-nums' : ''
                          }`}
                          key={`${row.rowNumber}-${column}`}
                        >
                          {isEditing ? (
                            <input
                              aria-label={`Financial Records row ${row.rowNumber} ${displayCell(grid.headers[column])}`}
                              className={`h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-bms-blue focus:ring-2 focus:ring-blue-100 ${
                                numericColumns.has(column) ? 'text-right' : ''
                              }`}
                              onChange={(event) =>
                                updateEditingCell(column, event.target.value)
                              }
                              step={numericColumns.has(column) ? '0.01' : undefined}
                              type={numericColumns.has(column) ? 'number' : 'text'}
                              value={displayCell(editingRow.values[column])}
                            />
                          ) : (
                            <span className="block whitespace-pre-wrap break-words">
                              {displayCell(value) || '-'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="sticky right-0 z-10 border-l border-slate-200 bg-white px-2.5 py-3 shadow-[-6px_0_10px_-10px_rgba(15,23,42,0.45)]">
                        <div className="flex gap-1.5">
                          {isEditing ? (
                            <>
                              <Button
                                className="min-h-8 px-2.5 py-1.5 text-xs"
                                disabled={isBusy}
                                onClick={() => void saveRow()}
                                type="button"
                              >
                                {savingRow === row.rowNumber ? 'Updating...' : 'Update'}
                              </Button>
                              <Button
                                className="min-h-8 px-2.5 py-1.5 text-xs"
                                disabled={isBusy}
                                onClick={() => setEditingRow(undefined)}
                                type="button"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                className="min-h-8 px-2.5 py-1.5 text-xs"
                                disabled={isBusy || Boolean(editingRow)}
                                onClick={() =>
                                  startEditing(row.rowNumber, row.values)
                                }
                                type="button"
                                variant="secondary"
                              >
                                Edit
                              </Button>
                              <Button
                                className="min-h-8 border-red-300 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"
                                disabled={isBusy || Boolean(editingRow)}
                                onClick={() => void removeRow(row.rowNumber)}
                                type="button"
                                variant="ghost"
                              >
                                {deletingRow === row.rowNumber
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            description="The live financial worksheet does not contain any data rows yet."
            icon={
              <svg
                aria-hidden="true"
                className="size-7"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 6.5h16M4 12h16M4 17.5h16M8 4v16M16 4v16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.7"
                />
              </svg>
            }
            title="No Financial Records"
          />
        )}
      </Card>
    </div>
  )
}
