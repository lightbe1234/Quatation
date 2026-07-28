import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  createQuotation,
  generateQuotationPdf,
  listRecentQuotations,
  transferQuotationToFinancial,
} from '../api/quotations'
import {
  getSummaryGrid,
  type SummaryGrid,
} from '../api/oneDrive'
import { listStores } from '../api/stores'
import { calculateGrandTotal } from '../calculations/quotationTotals'
import { ActualQuotationPreview } from '../components/ActualQuotationPreview'
import {
  GeneratedSummaryDownload,
  type GeneratedSummaryDownloadData,
} from '../components/GeneratedSummaryDownload'
import { QuotationDetailsForm } from '../components/QuotationDetailsForm'
import { QuotationLineItems } from '../components/QuotationLineItems'
import { QuotationWorkflowProgress } from '../components/QuotationWorkflowProgress'
import { LoadingSpinner } from '../components/LoadingSpinner'
import {
  Button,
  Card,
  PageHeader,
  StatusMessage,
  SummaryPanel,
  TwoColumnLayout,
} from '../components/ui'
import type {
  QuotationDraft,
  QuotationLineDraft,
  QuotationPayload,
  RecentQuotation,
  SavedQuotation,
} from '../types/quotation'
import type { Store } from '../types/store'

function localDate() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function emptyLine(): QuotationLineDraft {
  return {
    id: crypto.randomUUID(),
    description: '',
    qty: '1',
    unitPrice: '',
  }
}

export function createEmptyQuotationDraft(): QuotationDraft {
  return {
    qtnNo: '',
    jobNo: '',
    quoteDate: localDate(),
    unit: '',
    clientName: '',
    region: '',
    storeId: '',
    subject: '',
    introLine1: '',
    introLine2: '',
    items: [emptyLine()],
  }
}

type QuotationEntryPageProps = {
  persistedDraft?: QuotationDraft
  setPersistedDraft?: Dispatch<SetStateAction<QuotationDraft>>
}

function toPayload(draft: QuotationDraft): QuotationPayload {
  return {
    qtnNo: draft.qtnNo.trim(),
    jobNo: draft.jobNo.trim(),
    quoteDate: draft.quoteDate,
    unit: draft.unit.trim(),
    clientName: draft.clientName.trim(),
    region: draft.region.trim(),
    storeId: draft.storeId,
    subject: draft.subject.trim(),
    introLine1: draft.introLine1.trim(),
    introLine2: draft.introLine2.trim(),
    items: draft.items.map((item) => ({
      description: item.description.trim(),
      qty: Number(item.qty),
      unitPrice: Number(item.unitPrice),
    })),
  }
}

function toRecentQuotation(quotation: SavedQuotation): RecentQuotation {
  return {
    id: quotation.id,
    qtnNo: quotation.qtnNo,
    storeId: quotation.storeId,
    grandTotal: quotation.grandTotal,
    status: quotation.status,
    pdfGeneratedAt: quotation.pdfGeneratedAt,
    transferredAt: quotation.transferredAt,
    createdAt: quotation.createdAt,
  }
}

function findGeneratedSummaryRow(
  grid: SummaryGrid,
  qtnNo: string,
): GeneratedSummaryDownloadData | undefined {
  const referenceColumn = grid.headers.findIndex(
    (header) =>
      String(header ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase() === 'QUOTATION REF',
  )
  const column = referenceColumn >= 0 ? referenceColumn : 1
  const normalizedQtn = qtnNo.trim().toLowerCase()
  const row = [...grid.rows]
    .reverse()
    .find(
      (candidate) =>
        String(candidate[column] ?? '').trim().toLowerCase() === normalizedQtn,
    )

  return row ? { headers: grid.headers, row } : undefined
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function loadGeneratedSummaryRow(qtnNo: string) {
  const retryDelays = [0, 750, 1_500, 2_500]
  let lastError: unknown

  for (const delay of retryDelays) {
    if (delay > 0) {
      await wait(delay)
    }

    try {
      const summaryGrid = await getSummaryGrid()
      const summaryData = findGeneratedSummaryRow(summaryGrid, qtnNo)

      if (summaryData) {
        return summaryData
      }

      lastError = new Error('The generated quotation row was not found')
    } catch (requestError) {
      lastError = requestError
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('The generated quotation row was not found')
}

export function QuotationEntryPage({
  persistedDraft,
  setPersistedDraft,
}: QuotationEntryPageProps = {}) {
  const errorRef = useRef<HTMLDivElement>(null)
  const pdfFrameRef = useRef<HTMLIFrameElement>(null)
  const [localDraft, setLocalDraft] = useState<QuotationDraft>(
    createEmptyQuotationDraft,
  )
  const draft = persistedDraft ?? localDraft
  const setDraft = setPersistedDraft ?? setLocalDraft
  const [stores, setStores] = useState<Store[]>([])
  const [recentQuotations, setRecentQuotations] = useState<
    RecentQuotation[]
  >([])
  const [savedQuotation, setSavedQuotation] = useState<SavedQuotation>()
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string>()
  const [pdfStatus, setPdfStatus] = useState<string>()
  const [summaryDownloadData, setSummaryDownloadData] =
    useState<GeneratedSummaryDownloadData>()
  const [summaryDownloadError, setSummaryDownloadError] = useState<string>()
  const [isLoadingSummaryDownload, setIsLoadingSummaryDownload] =
    useState(false)
  const [transferStatus, setTransferStatus] = useState<string>()
  const [recentTransferId, setRecentTransferId] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const controller = new AbortController()

    listStores(controller.signal)
      .then(setStores)
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message)
        }
      })
      .finally(() => setIsLoadingStores(false))

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    listRecentQuotations(controller.signal)
      .then(setRecentQuotations)
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message)
        }
      })
      .finally(() => setIsLoadingRecent(false))

    return () => controller.abort()
  }, [])

  useEffect(
    () => () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    },
    [pdfUrl],
  )

  const selectedStore = stores.find((store) => store.id === draft.storeId)
  const grandTotal = useMemo(
    () => calculateGrandTotal(draft.items),
    [draft.items],
  )
  const isLocked = Boolean(savedQuotation)

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [error])

  const updateDetail = useCallback(
    (
      field: keyof Omit<QuotationDraft, 'items'>,
      value: string,
    ) => {
      setDraft((current) => ({ ...current, [field]: value }))
    },
    [],
  )

  const updateItem = useCallback(
    (
      id: string,
      field: keyof Omit<QuotationLineDraft, 'id'>,
      value: string,
    ) => {
      setDraft((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      }))
    },
    [],
  )

  const handleAddLine = useCallback(() => {
    setDraft((current) => ({
      ...current,
      items:
        current.items.length < 12
          ? [...current.items, emptyLine()]
          : current.items,
    }))
  }, [])

  const handleRemoveLine = useCallback((id: string) => {
    setDraft((current) => ({
      ...current,
      items:
        current.items.length > 1
          ? current.items.filter((item) => item.id !== id)
          : current.items,
    }))
  }, [])

  async function handleSubmit() {
    setError(undefined)

    if (
      !draft.storeId ||
      !draft.quoteDate ||
      !draft.qtnNo.trim() ||
      !draft.clientName.trim() ||
      !draft.region.trim()
    ) {
      setError('Branch, Date, QTN #, Client Name, and Region are required.')
      return
    }

    const invalidLine = draft.items.find(
      (item) =>
        !item.description.trim() ||
        !item.qty ||
        Number(item.qty) <= 0 ||
        item.unitPrice === '' ||
        Number(item.unitPrice) < 0,
    )

    if (invalidLine) {
      setError(
        'Every line needs a description, quantity above zero, and a non-negative unit price.',
      )
      return
    }

    setIsSaving(true)

    try {
      const quotation = await createQuotation(toPayload(draft))
      setSavedQuotation(quotation)
      setRecentQuotations((current) => [
        toRecentQuotation(quotation),
        ...current.filter((item) => item.id !== quotation.id),
      ])
    } catch (requestError) {
      setIsGeneratingPdf(false)
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The quotation could not be saved',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function resetQuotation() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }
    setDraft(createEmptyQuotationDraft())
    setSavedQuotation(undefined)
    setPdfUrl(undefined)
    setPdfStatus(undefined)
    setSummaryDownloadData(undefined)
    setSummaryDownloadError(undefined)
    setIsLoadingSummaryDownload(false)
    setTransferStatus(undefined)
    setError(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleGeneratePdf() {
    if (!savedQuotation) {
      return
    }

    const confirmed = window.confirm(
      'Generate this PDF now? This will replace the current values in the Excel Quatation template and overwrite the reusable summry row A2:H2. The Summary header row will remain unchanged.',
    )

    if (!confirmed) {
      return
    }

    setError(undefined)
    setPdfStatus(undefined)
    setSummaryDownloadData(undefined)
    setSummaryDownloadError(undefined)
    setIsLoadingSummaryDownload(false)
    setIsGeneratingPdf(true)

    try {
      const result = await generateQuotationPdf(savedQuotation.id)
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
      setPdfUrl(URL.createObjectURL(result.blob))
      setSavedQuotation((current) =>
        current
          ? {
              ...current,
              status:
                current.status === 'TRANSFERRED'
                  ? 'TRANSFERRED'
                  : 'PDF_GENERATED',
              pdfGeneratedAt: new Date().toISOString(),
            }
          : current,
      )
      setRecentQuotations((current) =>
        current.map((quotation) =>
          quotation.id === savedQuotation.id
            ? {
                ...quotation,
                status:
                  quotation.status === 'TRANSFERRED'
                    ? 'TRANSFERRED'
                    : 'PDF_GENERATED',
                pdfGeneratedAt: new Date().toISOString(),
              }
            : quotation,
        ),
      )
      setPdfStatus('PDF generated successfully. Summary logged successfully.')
      setIsGeneratingPdf(false)
      setIsLoadingSummaryDownload(true)
      try {
        setSummaryDownloadData(
          await loadGeneratedSummaryRow(savedQuotation.qtnNo),
        )
      } catch (requestError) {
        setSummaryDownloadError(
          requestError instanceof Error
            ? `The PDF and Summary row were created, but the live Summary could not be loaded for Excel download: ${requestError.message}`
            : 'The PDF and Summary row were created, but the live Summary could not be loaded for Excel download. Refresh the Summary Worksheet and try again.',
        )
      } finally {
        setIsLoadingSummaryDownload(false)
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The PDF could not be generated',
      )
    }
  }

  async function handleTransferFinancial() {
    if (!savedQuotation || savedQuotation.status === 'DRAFT') {
      return
    }

    if (!savedQuotation.storeId) {
      setError(
        'This quotation is missing its Branch link. Start a new quotation with a current Branch before transferring to Financial.',
      )
      return
    }

    const confirmed = window.confirm(
      'Transfer this quotation to the financial ledger now? This appends one row to the financial tab. Existing Approval Status and After Approval values will not be changed.',
    )

    if (!confirmed) {
      return
    }

    setError(undefined)
    setTransferStatus(undefined)
    setIsTransferring(true)

    try {
      const result = await transferQuotationToFinancial(savedQuotation.id)
      setSavedQuotation((current) =>
        current
          ? {
              ...current,
              status: result.status,
              transferredAt: result.transferredAt,
            }
          : current,
      )
      setRecentQuotations((current) =>
        current.map((quotation) =>
          quotation.id === savedQuotation.id
            ? {
                ...quotation,
                status: result.status,
                transferredAt: result.transferredAt,
              }
            : quotation,
        ),
      )
      setTransferStatus(
        result.financialStatus === 'created'
          ? 'Transferred to Financial successfully.'
          : 'Financial row already existed; no duplicate was added.',
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The financial transfer could not be completed',
      )
    } finally {
      setIsTransferring(false)
    }
  }

  async function handleRecentTransfer(quotation: RecentQuotation) {
    if (!quotation.storeId) {
      setError(
        'This older quotation is missing its Branch link. Start a new quotation with a current Branch before transferring to Financial.',
      )
      return
    }

    const confirmed = window.confirm(
      `Transfer quotation ${quotation.qtnNo} to the financial ledger now? This appends one row and will not overwrite existing manual Financial columns.`,
    )

    if (!confirmed) {
      return
    }

    setError(undefined)
    setTransferStatus(undefined)
    setRecentTransferId(quotation.id)

    try {
      const result = await transferQuotationToFinancial(quotation.id)
      setRecentQuotations((current) =>
        current.map((item) =>
          item.id === quotation.id
            ? {
                ...item,
                status: result.status,
                transferredAt: result.transferredAt,
              }
            : item,
        ),
      )
      if (savedQuotation?.id === quotation.id) {
        setSavedQuotation((current) =>
          current
            ? {
                ...current,
                status: result.status,
                transferredAt: result.transferredAt,
              }
            : current,
        )
      }
      setTransferStatus(
        result.financialStatus === 'created'
          ? `${quotation.qtnNo} transferred to Financial successfully.`
          : `${quotation.qtnNo} already existed in Financial; no duplicate was added.`,
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The financial transfer could not be completed',
      )
    } finally {
      setRecentTransferId(undefined)
    }
  }

  function handlePrintPdf() {
    const pdfWindow = pdfFrameRef.current?.contentWindow

    if (!pdfWindow) {
      setError('The PDF preview is not ready to print yet.')
      return
    }

    pdfWindow.focus()
    pdfWindow.print()
  }

  const pendingFinancialTransfers = recentQuotations.filter(
    (quotation) =>
      quotation.status === 'PDF_GENERATED' && Boolean(quotation.storeId),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        description="Complete the form and save a Supabase draft. After confirmation, Generate PDF writes Excel and shows the actual workbook-rendered quotation."
        eyebrow="Quotation entry"
        title="Prepare a service quotation"
      />

      <QuotationWorkflowProgress
        hasPdf={Boolean(pdfUrl)}
        status={savedQuotation?.status}
      />

      {isLoadingStores && (
        <StatusMessage tone="info">
          <span className="size-2 animate-pulse rounded-full bg-bms-blue" />
          Loading stores...
        </StatusMessage>
      )}

      {error && (
        <div
          ref={errorRef}
        >
          <StatusMessage tone="error">{error}</StatusMessage>
        </div>
      )}

      {transferStatus && (
        <StatusMessage>{transferStatus}</StatusMessage>
      )}

      <Card
        aria-busy={isLoadingRecent || Boolean(recentTransferId)}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Financial workflow
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">
              Pending Financial transfers
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            Generated quotations remain available after a page refresh.
          </p>
        </div>

        {isLoadingRecent ? (
          <p className="mt-5 text-sm font-medium text-slate-500">
            Loading recent quotations...
          </p>
        ) : pendingFinancialTransfers.length === 0 ? (
          <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No generated quotations are waiting for Financial transfer.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {pendingFinancialTransfers.map((quotation) => (
              <div
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={quotation.id}
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {quotation.qtnNo}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Total {quotation.grandTotal.toFixed(2)} - PDF generated
                  </p>
                </div>
                <Button
                  disabled={Boolean(recentTransferId)}
                  onClick={() => handleRecentTransfer(quotation)}
                  type="button"
                  variant="financial"
                >
                  {recentTransferId === quotation.id
                    ? 'Transferring...'
                    : 'Transfer to Financial'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {savedQuotation && (
        <StatusMessage>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Quotation saved successfully.</p>
              <p className="mt-1 text-emerald-700">
                {savedQuotation.qtnNo} is stored as {savedQuotation.status}.
                {savedQuotation.status === 'DRAFT'
                  ? ' Excel has not been changed yet.'
                  : savedQuotation.status === 'TRANSFERRED'
                    ? ' The PDF, summary, and financial row are complete.'
                : ' The PDF is ready and the summary is logged.'}
              </p>
            </div>
            <Button
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              disabled={isGeneratingPdf || isTransferring}
              onClick={resetQuotation}
              type="button"
              variant="ghost"
            >
              Start another quotation
            </Button>
          </div>
          {pdfStatus && (
            <p className="mt-4 border-t border-emerald-200 pt-4 font-semibold">
              {pdfStatus}
            </p>
          )}
        </StatusMessage>
      )}

      <TwoColumnLayout
        main={
          <>
          <Card>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Quotation details
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Selecting a Branch fills the saved branch details automatically.
              </p>
            </div>
            <QuotationDetailsForm
              disabled={isLocked || isLoadingStores}
              draft={draft}
              onChange={updateDetail}
              selectedStore={selectedStore}
              stores={stores}
            />
          </Card>

          <Card>
            <QuotationLineItems
              disabled={isLocked}
              items={draft.items}
              onAdd={handleAddLine}
              onChange={updateItem}
              onRemove={handleRemoveLine}
            />
          </Card>
          </>
        }
        aside={
          <>
          <SummaryPanel
            eyebrow="Quotation total"
            footer="Save to Supabase first. Generate PDF then writes the confirmed values to Excel and logs the summary. Print becomes available when the PDF preview is ready. Transfer becomes available only after PDF generation."
            title="Action summary"
          >
            <div
              aria-busy={isSaving || isGeneratingPdf || isTransferring}
              className="space-y-5"
            >
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quotation total
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-slate-950">
                  {grandTotal.toFixed(2)}
                </p>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {draft.items.length}/12 lines
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Button
                disabled={isSaving || isLocked || isLoadingStores}
                onClick={handleSubmit}
                type="button"
              >
                {isSaving
                  ? 'Saving quotation...'
                  : isLocked
                    ? 'Quotation saved'
                    : '1. Save quotation'}
              </Button>
              <Button
                disabled={
                  !savedQuotation || isGeneratingPdf || isTransferring
                }
                onClick={handleGeneratePdf}
                type="button"
                variant="secondary"
              >
                {isGeneratingPdf && <LoadingSpinner />}
                <span>
                  {isGeneratingPdf
                    ? 'Generating PDF...'
                    : savedQuotation &&
                        savedQuotation.status !== 'DRAFT'
                      ? '2. Regenerate PDF'
                      : '2. Generate PDF'}
                </span>
              </Button>
              <Button
                disabled={!pdfUrl}
                onClick={handlePrintPdf}
                type="button"
                variant="dark"
              >
                3. Print PDF
              </Button>
              <Button
                disabled={
                  !savedQuotation ||
                  savedQuotation.status === 'DRAFT' ||
                  savedQuotation.status === 'TRANSFERRED' ||
                  isGeneratingPdf ||
                  isTransferring
                }
                onClick={handleTransferFinancial}
                type="button"
                variant="financial"
              >
                {isTransferring
                  ? 'Transferring...'
                  : savedQuotation?.status === 'TRANSFERRED'
                    ? '4. Transferred'
                    : '4. Transfer to Financial'}
              </Button>
            </div>
            {!savedQuotation && !selectedStore && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Before saving, select a Branch above. Branch ID and Contact
                must appear instead of hyphens.
              </p>
            )}
            </div>
          </SummaryPanel>

          <GeneratedSummaryDownload
            data={summaryDownloadData}
            error={summaryDownloadError}
            isGenerating={isGeneratingPdf || isLoadingSummaryDownload}
          />

          <ActualQuotationPreview
            frameRef={pdfFrameRef}
            isGenerating={isGeneratingPdf}
            pdfUrl={pdfUrl}
            qtnNo={savedQuotation?.qtnNo}
          />
          </>
        }
      />
    </div>
  )
}
