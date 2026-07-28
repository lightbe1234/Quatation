import { useState } from 'react'
import {
  downloadSummaryWorkbook,
  type SummaryGridCell,
} from '../api/oneDrive'
import { LoadingSpinner } from './LoadingSpinner'
import { Button, Card } from './ui'

export type GeneratedSummaryDownloadData = {
  headers: SummaryGridCell[]
  row: SummaryGridCell[]
}

type GeneratedSummaryDownloadProps = {
  data?: GeneratedSummaryDownloadData
  error?: string
  isGenerating: boolean
}

function displayCell(value: SummaryGridCell) {
  return value === null ? '' : String(value)
}

export function GeneratedSummaryDownload({
  data,
  error,
  isGenerating,
}: GeneratedSummaryDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<string>()

  if (!isGenerating && !data && !error) {
    return null
  }

  async function handleDownload() {
    setIsDownloading(true)
    setDownloadStatus(undefined)

    try {
      const workbook = await downloadSummaryWorkbook()
      const downloadUrl = URL.createObjectURL(workbook)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = 'quotation-summary.xlsx'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
      setDownloadStatus('Summary Excel downloaded successfully.')
    } catch (requestError) {
      setDownloadStatus(
        requestError instanceof Error
          ? requestError.message
          : 'The Summary Excel workbook could not be downloaded',
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card aria-busy={isGenerating || isDownloading} padded={false}>
      {isGenerating ? (
        <div
          className="flex items-center justify-center gap-3 p-6 text-sm font-semibold text-bms-blue"
          role="status"
        >
          <LoadingSpinner className="size-5" />
          Generating summary...
        </div>
      ) : data ? (
        <>
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-bms-blue">
                Live Summary worksheet
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                Summary Excel workbook is ready
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Downloads one Excel file containing only the formatted
                `summry` worksheet.
              </p>
            </div>
            <Button
              disabled={isDownloading}
              onClick={() => void handleDownload()}
              type="button"
            >
              {isDownloading ? (
                <>
                  <LoadingSpinner className="size-4" />
                  Downloading...
                </>
              ) : (
                'Download Summary Excel'
              )}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[65rem] table-fixed border-collapse text-xs">
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
              <thead>
                <tr>
                  {data.headers.map((header, column) => (
                    <th
                      className="border border-slate-900 bg-[#4f7f2b] px-2 py-3 text-center font-bold uppercase leading-tight text-white"
                      key={`header-${column}`}
                      scope="col"
                    >
                      {displayCell(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {data.headers.map((_, column) => (
                    <td
                      className="h-20 border border-slate-900 bg-white px-2 py-3 text-center align-middle font-semibold leading-5 text-slate-950"
                      key={`value-${column}`}
                    >
                      {displayCell(data.row[column] ?? null)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {downloadStatus && (
            <p
              aria-live="polite"
              className={`border-t px-5 py-3 text-sm font-medium ${
                downloadStatus.endsWith('successfully.')
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
              role="status"
            >
              {downloadStatus}
            </p>
          )}
        </>
      ) : (
        <p className="p-6 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </Card>
  )
}
