import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SelectableDataGrid } from '../components/SelectableDataGrid'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatusMessage,
  TwoColumnLayout,
} from '../components/ui'
import {
  getConnectOneDriveUrl,
  getOneDriveStatus,
  getSummaryGrid,
  inspectTestCell,
  refreshPdfTemplate,
  runTestCell,
  type OneDriveStatus,
  type SummaryGrid,
  type TestCellCandidate,
} from '../api/oneDrive'

export function OneDrivePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<OneDriveStatus>()
  const [summaryGrid, setSummaryGrid] = useState<SummaryGrid>()
  const [candidate, setCandidate] = useState<TestCellCandidate>()
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [isInspecting, setIsInspecting] = useState(false)
  const [isRefreshingPdf, setIsRefreshingPdf] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const callbackError = searchParams.get('error')

    if (callbackError) {
      setError(`Microsoft sign-in failed: ${callbackError}`)
    } else if (searchParams.get('connected') === '1') {
      setMessage('OneDrive connected and workbook discovered successfully.')
    }

    if (searchParams.size > 0) {
      setSearchParams({}, { replace: true })
    }

    getOneDriveStatus()
      .then(async (nextStatus) => {
        setStatus(nextStatus)
        if (nextStatus.connected) {
          await loadSummaryData(false)
        }
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [searchParams, setSearchParams])

  async function loadSummaryData(showConfirmation = true) {
    setIsLoadingSummary(true)
    if (showConfirmation) {
      setError(undefined)
      setMessage(undefined)
    }

    try {
      setSummaryGrid(await getSummaryGrid())
      if (showConfirmation) {
        setMessage('Summary worksheet data refreshed successfully.')
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The Summary worksheet could not be loaded',
      )
    } finally {
      setIsLoadingSummary(false)
    }
  }

  async function handleInspect() {
    setIsInspecting(true)
    setError(undefined)
    setMessage(undefined)

    try {
      setCandidate(await inspectTestCell())
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The workbook could not be inspected',
      )
    } finally {
      setIsInspecting(false)
    }
  }

  async function handleRefreshPdf() {
    const confirmed = window.confirm(
      'Refresh the PDF template from the current Web app.xlsx file? This replaces only Web app PDF Export.xlsx and does not change the main workbook.',
    )

    if (!confirmed) {
      return
    }

    setIsRefreshingPdf(true)
    setError(undefined)
    setMessage(undefined)

    try {
      await refreshPdfTemplate()
      setMessage('PDF template refreshed from Web app.xlsx successfully.')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The PDF template could not be refreshed',
      )
    } finally {
      setIsRefreshingPdf(false)
    }
  }

  async function handleTest() {
    if (!candidate) {
      return
    }

    const fullAddress = `${candidate.worksheet}!${candidate.address}`
    const confirmed = window.confirm(
      `Temporarily write a test marker to ${fullAddress}, verify it, and restore the cell to blank?`,
    )

    if (!confirmed) {
      return
    }

    setIsTesting(true)
    setError(undefined)
    setMessage(undefined)

    try {
      const result = await runTestCell(candidate)
      setMessage(
        `${result.address} was written, verified, and restored to blank successfully.`,
      )
      setCandidate(undefined)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The Graph write test failed',
      )
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Connect the personal Microsoft account that owns Web app.xlsx, then verify controlled read/write access."
        eyebrow="Microsoft Graph connection"
        title="OneDrive workbook"
      />

      {(message || error) && (
        <StatusMessage tone={error ? 'error' : 'success'}>
          {error ?? message}
        </StatusMessage>
      )}

      <TwoColumnLayout
        main={
          <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Connection status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${
                  isLoading
                    ? 'animate-pulse bg-amber-400'
                    : status?.connected
                      ? 'bg-emerald-500'
                      : 'bg-red-500'
                }`}
              />
              <p className="text-base font-semibold text-slate-950">
                {isLoading
                  ? 'Checking OneDrive...'
                  : status?.connected
                    ? 'Connected'
                    : 'Not connected'}
              </p>
            </div>
            {status?.workbook && (
              <p className="mt-2 text-sm text-slate-600">
                Workbook: {status.workbook.name}
              </p>
            )}
          </div>

          {!status?.connected && !isLoading && (
            <a
              className="inline-flex min-h-10 justify-center rounded-lg border border-bms-blue bg-bms-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-900"
              href={getConnectOneDriveUrl()}
            >
              Connect OneDrive
            </a>
          )}
        </div>
      </Card>

      {status?.connected && (
        <Card aria-busy={isLoadingSummary} className="overflow-hidden" padded={false}>
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-bms-blue">
                Summary worksheet
              </p>
              <h3 className="mt-1.5 text-lg font-bold text-slate-950">
                Select and copy workbook cells
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                This read-only grid displays the workbook's `summry` data.
                The full used range is selected automatically, so Copy sends
                the same rows and columns to Excel or Google Sheets.
              </p>
            </div>
            <Button
              className="shrink-0"
              disabled={isLoadingSummary}
              onClick={() => void loadSummaryData()}
              type="button"
              variant="secondary"
            >
              {isLoadingSummary && <LoadingSpinner />}
              <span>{isLoadingSummary ? 'Refreshing...' : 'Refresh data'}</span>
            </Button>
          </div>

          {isLoadingSummary && !summaryGrid ? (
            <div
              className="flex items-center justify-center gap-3 px-5 py-10 text-sm font-medium text-slate-600"
              role="status"
            >
              <LoadingSpinner className="size-5" />
              Loading Summary worksheet...
            </div>
          ) : summaryGrid ? (
            <SelectableDataGrid
              headers={summaryGrid.headers}
              label="Selectable Summary worksheet grid"
              rows={summaryGrid.rows}
            />
          ) : (
            <EmptyState
              description="Refresh the workbook connection to load the latest Summary worksheet cells."
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
              title="Summary worksheet data is not available"
            />
          )}
        </Card>
      )}
          </div>
        }
        aside={
          <div className="space-y-5">

      {status?.connected && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            PDF template
          </p>
          <h3 className="mt-1.5 text-lg font-semibold text-slate-950">
            Refresh export workbook
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            Use this after changing formatting in Web app.xlsx. It updates
            only the PDF export helper and leaves the main workbook, Summary,
            and Financial sheets unchanged.
          </p>
          <Button
            className="mt-5"
            disabled={isRefreshingPdf}
            onClick={handleRefreshPdf}
            type="button"
            variant="secondary"
          >
            {isRefreshingPdf && <LoadingSpinner />}
            <span>
              {isRefreshingPdf
                ? 'Refreshing PDF template...'
                : 'Refresh PDF template'}
            </span>
          </Button>
        </Card>
      )}

      {status?.connected && (
        <Card>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Controlled workbook test
            </p>
            <h3 className="mt-1.5 text-lg font-semibold text-slate-950">
              Inspect before writing
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              Inspection is read-only. It finds a blank cell outside the
              worksheet's used range and shows the exact address before any
              write is allowed.
            </p>
          </div>

          {!candidate ? (
            <Button
              className="mt-5"
              disabled={isInspecting}
              onClick={handleInspect}
              type="button"
              variant="secondary"
            >
              {isInspecting ? 'Inspecting workbook...' : 'Inspect safe test cell'}
            </Button>
          ) : (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">
                Proposed blank cell: {candidate.worksheet}!{candidate.address}
              </p>
              <p className="mt-2 text-sm text-amber-800">
                Current used range: {candidate.usedRange}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                The test writes a unique marker, reads it back, and clears the
                cell. A confirmation dialog appears before execution.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button
                  disabled={isTesting}
                  onClick={handleTest}
                  type="button"
                >
                  {isTesting ? 'Testing and restoring...' : 'Run confirmed test'}
                </Button>
                <Button
                  disabled={isTesting}
                  onClick={() => setCandidate(undefined)}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
          </div>
        }
      />
    </div>
  )
}
