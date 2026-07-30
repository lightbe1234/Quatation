import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { copyTabularData } from '../utils/clipboard'

export type DataGridCell = string | number | boolean | null

type CellPosition = {
  column: number
  row: number
}

type SelectableDataGridProps = {
  defaultSelection?: 'all' | 'data'
  headers: DataGridCell[]
  label: string
  minTableWidthClassName?: string
  rows: DataGridCell[][]
  showSelectAllButton?: boolean
  variant?: 'default' | 'summaryPreview'
}

function columnName(index: number) {
  let value = index + 1
  let result = ''

  while (value > 0) {
    const remainder = (value - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    value = Math.floor((value - 1) / 26)
  }

  return result
}

function displayCell(value: DataGridCell) {
  if (value === null) {
    return ''
  }

  return String(value)
}

export function SelectableDataGrid({
  defaultSelection = 'all',
  headers,
  label,
  minTableWidthClassName = 'min-w-[62rem]',
  rows,
  showSelectAllButton = false,
  variant = 'default',
}: SelectableDataGridProps) {
  const initialRow = defaultSelection === 'data' && rows.length > 0 ? 1 : 0
  const gridRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<CellPosition | undefined>(() =>
    headers.length > 0 ? { column: 0, row: initialRow } : undefined,
  )
  const [focus, setFocus] = useState<CellPosition | undefined>(() =>
    headers.length > 0
      ? { column: headers.length - 1, row: rows.length }
      : undefined,
  )
  const [isDragging, setIsDragging] = useState(false)
  const [copyStatus, setCopyStatus] = useState<string>()
  const allRows = useMemo(() => [headers, ...rows], [headers, rows])

  const selection = useMemo(() => {
    if (!anchor || !focus) {
      return undefined
    }

    return {
      firstColumn: Math.min(anchor.column, focus.column),
      firstRow: Math.min(anchor.row, focus.row),
      lastColumn: Math.max(anchor.column, focus.column),
      lastRow: Math.max(anchor.row, focus.row),
    }
  }, [anchor, focus])

  const selectedCount = selection
    ? (selection.lastRow - selection.firstRow + 1) *
      (selection.lastColumn - selection.firstColumn + 1)
    : 0
  const allCellsSelected = Boolean(
    selection &&
      selection.firstColumn === 0 &&
      selection.firstRow === 0 &&
      selection.lastColumn === headers.length - 1 &&
      selection.lastRow === rows.length,
  )
  const dataRowsSelected = Boolean(
    selection &&
      rows.length > 0 &&
      selection.firstColumn === 0 &&
      selection.firstRow === 1 &&
      selection.lastColumn === headers.length - 1 &&
      selection.lastRow === rows.length,
  )

  useEffect(() => {
    if (headers.length === 0) {
      setAnchor(undefined)
      setFocus(undefined)
    } else {
      const nextInitialRow =
        defaultSelection === 'data' && rows.length > 0 ? 1 : 0
      setAnchor({ column: 0, row: nextInitialRow })
      setFocus({
        column: headers.length - 1,
        row: rows.length,
      })
    }
    setCopyStatus(undefined)
  }, [defaultSelection, headers, rows])

  useEffect(() => {
    function finishDrag() {
      setIsDragging(false)
    }

    document.addEventListener('mouseup', finishDrag)
    return () => document.removeEventListener('mouseup', finishDrag)
  }, [])

  const copySelection = useCallback(async () => {
    if (!selection) {
      return
    }

    const copiedRows: DataGridCell[][] = []
    for (let row = selection.firstRow; row <= selection.lastRow; row += 1) {
      const copiedCells: DataGridCell[] = []
      for (
        let column = selection.firstColumn;
        column <= selection.lastColumn;
        column += 1
      ) {
        copiedCells.push(allRows[row]?.[column] ?? null)
      }
      copiedRows.push(copiedCells)
    }

    try {
      await copyTabularData(copiedRows, {
        format: variant === 'summaryPreview' ? 'summary' : 'plain',
      })
      setCopyStatus(
        `${selectedCount} ${selectedCount === 1 ? 'cell' : 'cells'} copied.`,
      )
    } catch {
      setCopyStatus('Could not copy the selected cells.')
    }
  }, [allRows, selectedCount, selection, variant])

  function selectAllCells() {
    if (headers.length === 0) {
      return
    }

    setAnchor({ column: 0, row: 0 })
    setFocus({ column: headers.length - 1, row: rows.length })
    setCopyStatus(undefined)
    gridRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      selection &&
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'c'
    ) {
      event.preventDefault()
      void copySelection()
    }
  }

  function handleCellMouseDown(
    event: MouseEvent,
    position: CellPosition,
  ) {
    event.preventDefault()
    gridRef.current?.focus()
    setCopyStatus(undefined)

    if (event.shiftKey && anchor) {
      setFocus(position)
      setIsDragging(false)
      return
    }

    setAnchor(position)
    setFocus(position)
    setIsDragging(true)
  }

  function handleCellMouseEnter(position: CellPosition) {
    if (isDragging) {
      setFocus(position)
    }
  }

  function isSelected(row: number, column: number) {
    return Boolean(
      selection &&
        row >= selection.firstRow &&
        row <= selection.lastRow &&
        column >= selection.firstColumn &&
        column <= selection.lastColumn,
    )
  }

  if (headers.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-slate-500">
        The Summary worksheet has no readable header row.
      </div>
    )
  }

  return (
    <div>
      <div
        className={`flex min-h-14 flex-col gap-2.5 border-b px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
          variant === 'summaryPreview'
            ? 'border-slate-300 bg-white'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {allCellsSelected
              ? `All ${selectedCount} cells selected automatically`
              : dataRowsSelected
                ? `All ${selectedCount} data cells selected automatically`
              : selection
              ? `${selectedCount} ${selectedCount === 1 ? 'cell' : 'cells'} selected`
              : 'Select cells to copy'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Select cells, then Copy. Data is copied with tabs between columns
            and new lines between rows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showSelectAllButton && (
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={selectAllCells}
              type="button"
            >
              Select all cells
            </button>
          )}
          <button
            className="rounded-lg bg-bms-blue px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            disabled={!selection}
            onClick={() => void copySelection()}
            title={selection ? 'Copy selected cells' : 'Select cells to enable copy'}
            type="button"
          >
            Copy
          </button>
        </div>
      </div>

      <p
        aria-live="polite"
        className={`px-4 text-sm font-medium transition-all ${
          copyStatus
            ? 'border-b border-emerald-200 bg-emerald-50 py-3 text-emerald-800'
            : 'h-0 overflow-hidden'
        }`}
        role="status"
      >
        {copyStatus}
      </p>

      <div
        aria-label={label}
        className="overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bms-blue"
        onKeyDown={handleKeyDown}
        ref={gridRef}
        tabIndex={0}
      >
        <table
          className={`${minTableWidthClassName} table-fixed border-collapse text-left ${
            variant === 'summaryPreview'
              ? 'text-[12px] font-semibold'
              : 'text-xs'
          }`}
        >
          {variant === 'summaryPreview' && (
            <colgroup>
              <col className="w-16" />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-24" />
              <col className="w-72" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-28" />
            </colgroup>
          )}
          <thead>
            <tr>
              {headers.map((header, column) => {
                const selected = isSelected(0, column)
                const address = `${columnName(column)}1`

                return (
                  <th
                    aria-label={`Cell ${address}: ${displayCell(header)}`}
                    className={
                      variant === 'summaryPreview'
                        ? `cursor-cell select-none border border-black bg-[#4f7f2b] px-2 py-2 text-center text-[11px] font-black uppercase leading-tight tracking-wide text-white ${
                            selected
                              ? 'ring-2 ring-inset ring-bms-blue'
                              : ''
                          }`
                        : `cursor-cell select-none border border-slate-300 px-2.5 py-2.5 font-bold text-slate-800 ${
                            selected
                              ? 'bg-blue-100 ring-1 ring-inset ring-bms-blue'
                              : 'bg-slate-100'
                          }`
                    }
                    key={address}
                    onMouseDown={(event) =>
                      handleCellMouseDown(event, { column, row: 0 })
                    }
                    onMouseEnter={() =>
                      handleCellMouseEnter({ column, row: 0 })
                    }
                    scope="col"
                  >
                    {displayCell(header)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowValues, rowIndex) => {
              const row = rowIndex + 1

              return (
                <tr key={row}>
                  {headers.map((_, column) => {
                    const value = rowValues[column] ?? null
                    const selected = isSelected(row, column)
                    const address = `${columnName(column)}${row + 1}`

                    return (
                      <td
                        aria-label={`Cell ${address}: ${displayCell(value)}`}
                        className={
                          variant === 'summaryPreview'
                            ? `h-24 cursor-cell select-none border border-black bg-white px-2 py-2.5 text-center align-middle text-black ${
                                selected
                                  ? 'ring-2 ring-inset ring-bms-blue'
                                  : 'hover:bg-blue-50'
                              } ${
                                column === 1 ||
                                column === 2 ||
                                column === 3 ||
                                column === 5 ||
                                column === 7
                                  ? 'font-bold'
                                  : 'font-medium'
                              }`
                            : `cursor-cell select-none border border-slate-300 px-2.5 py-2.5 align-top text-slate-700 ${
                                selected
                                  ? 'bg-blue-100 ring-1 ring-inset ring-bms-blue'
                                  : 'bg-white hover:bg-blue-50'
                              }`
                        }
                        key={address}
                        onMouseDown={(event) =>
                          handleCellMouseDown(event, { column, row })
                        }
                        onMouseEnter={() =>
                          handleCellMouseEnter({ column, row })
                        }
                      >
                        <span
                          className={`block whitespace-pre-wrap break-words ${
                            variant === 'summaryPreview'
                              ? 'max-h-20 leading-5'
                              : 'max-h-20 overflow-hidden leading-5'
                          }`}
                        >
                          {displayCell(value) || '\u00a0'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
