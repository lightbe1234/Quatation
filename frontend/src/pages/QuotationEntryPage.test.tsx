import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createQuotation,
  generateQuotationPdf,
  listRecentQuotations,
  transferQuotationToFinancial,
} from '../api/quotations'
import {
  downloadSummaryWorkbook,
  getSummaryGrid,
} from '../api/oneDrive'
import { listStores } from '../api/stores'
import type { Store } from '../types/store'
import { QuotationEntryPage } from './QuotationEntryPage'

vi.mock('../api/stores', () => ({
  listStores: vi.fn(),
}))

vi.mock('../api/quotations', () => ({
  createQuotation: vi.fn(),
  generateQuotationPdf: vi.fn(),
  listRecentQuotations: vi.fn(),
  transferQuotationToFinancial: vi.fn(),
}))

vi.mock('../api/oneDrive', () => ({
  downloadSummaryWorkbook: vi.fn(),
  getSummaryGrid: vi.fn(),
}))

const testStore: Store = {
  id: 'f9b725e0-d234-4ef4-b513-5c83285a7036',
  storeNo: '1830120',
  storeName: 'Test Store Name',
  contactName: 'Mr. Test Contact',
  branch: 'Test Branch',
  branchId: 'TEST-BRN',
  region: 'Test Region',
  clientName: 'Test Client',
  createdAt: '2026-07-23T00:00:00.000Z',
}

describe('QuotationEntryPage', () => {
  beforeEach(() => {
    vi.mocked(listStores).mockResolvedValue([testStore])
    vi.mocked(createQuotation).mockReset()
    vi.mocked(generateQuotationPdf).mockReset()
    vi.mocked(getSummaryGrid).mockReset()
    vi.mocked(downloadSummaryWorkbook).mockReset()
    vi.mocked(downloadSummaryWorkbook).mockResolvedValue(
      new Blob(['xlsx-summary'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    )
    vi.mocked(getSummaryGrid).mockResolvedValue({
      address: 'A1:H1',
      headers: [],
      rows: [],
      worksheet: 'summry',
    })
    vi.mocked(listRecentQuotations).mockResolvedValue([])
    vi.mocked(transferQuotationToFinancial).mockReset()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test-pdf'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('auto-fills read-only branch details after selecting a Branch', async () => {
    const user = userEvent.setup()
    render(<QuotationEntryPage />)

    const storeSelect = await screen.findByLabelText(/^Branch/)
    await user.selectOptions(storeSelect, testStore.id)

    expect(screen.getByRole('option', {
      name: 'Test Branch - TEST-BRN - Mr. Test Contact',
    })).toBeTruthy()
    expect(screen.getAllByText('Test Branch').length).toBeGreaterThan(0)
    expect(screen.getAllByText('TEST-BRN').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mr. Test Contact').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Region/)).toBeTruthy()
  })

  it('updates form text while the actual preview remains ungenerated', async () => {
    const user = userEvent.setup()
    render(<QuotationEntryPage />)

    const intro = await screen.findByLabelText('Intro line 1')
    await user.type(intro, 'Responsive preview text')

    expect((intro as HTMLTextAreaElement).value).toBe(
      'Responsive preview text',
    )
    expect(screen.getByText('No demo preview is shown')).toBeTruthy()
  })

  it('shows the generated workbook PDF in the actual Excel preview panel', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(true)
    vi.mocked(createQuotation).mockImplementation(async (payload) => ({
      ...payload,
      id: 'preview-quotation-id',
      grandTotal: 25,
      status: 'DRAFT',
      pdfGeneratedAt: null,
      transferredAt: null,
      createdAt: '2026-07-23T00:00:00.000Z',
    }))
    vi.mocked(generateQuotationPdf).mockResolvedValue({
      blob: new Blob(['%PDF-actual-excel'], {
        type: 'application/pdf',
      }),
      summaryStatus: 'created',
    })
    render(<QuotationEntryPage />)

    await user.selectOptions(
      await screen.findByLabelText(/^Branch/),
      testStore.id,
    )
    await user.type(screen.getByLabelText(/QTN #/), 'QTN-PREVIEW')
    await user.type(screen.getByLabelText(/Client Name/), 'Test Client')
    await user.type(screen.getByLabelText(/Region/), 'Test Region')
    await user.type(screen.getByLabelText(/^Description/), 'Test service')
    await user.type(screen.getByLabelText(/Unit Price/), '25')
    await user.click(
      screen.getByRole('button', { name: '1. Save quotation' }),
    )
    await user.click(
      await screen.findByRole('button', { name: '2. Generate PDF' }),
    )

    const frame = await screen.findByTitle(
      'Actual Excel quotation QTN-PREVIEW',
    )
    expect((frame as HTMLIFrameElement).src).toContain('blob:test-pdf')
    expect(
      screen.getAllByRole('link', { name: 'Download PDF' }).length,
    ).toBeGreaterThan(0)
  }, 15_000)

  it('allows exactly 12 line items and disables Add Line at the limit', async () => {
    const user = userEvent.setup()
    render(<QuotationEntryPage />)

    await waitFor(() => {
      expect(screen.queryByText('Loading stores...')).toBeNull()
    })

    const addButton = screen.getByRole('button', { name: '+ Add Line' })

    for (let index = 0; index < 11; index += 1) {
      await user.click(addButton)
    }

    expect(screen.getByText('12 of 12 item rows used')).toBeTruthy()
    expect(screen.getAllByLabelText(/Description/)).toHaveLength(12)
    expect((addButton as HTMLButtonElement).disabled).toBe(true)
    expect(
      screen.getByText(
        'Maximum reached: Excel rows 26 through 37 allow 12 items.',
      ),
    ).toBeTruthy()
  })

  it('does not show the removed hardcoded Summary preview', async () => {
    const user = userEvent.setup()
    render(<QuotationEntryPage />)

    await user.selectOptions(
      await screen.findByLabelText(/^Branch/),
      testStore.id,
    )
    await user.type(screen.getByLabelText(/QTN #/), 'QTN-SUMMARY')
    await user.type(screen.getByLabelText(/^Description/), 'Test service')
    await user.type(screen.getByLabelText(/Unit Price/), '25')

    expect(screen.queryByText('Copy-ready summry row')).toBeNull()
    expect(
      screen.queryByLabelText('Copy-ready quotation summary preview'),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull()
  })

  it('loads the real Summary row and downloads its Excel workbook after PDF generation', async () => {
    const user = userEvent.setup()
    let resolvePdf:
      | ((value: {
          blob: Blob
          summaryStatus: string
        }) => void)
      | undefined
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(createQuotation).mockImplementation(async (payload) => ({
      ...payload,
      id: 'copy-quotation-id',
      grandTotal: 25,
      status: 'DRAFT',
      pdfGeneratedAt: null,
      transferredAt: null,
      createdAt: '2026-07-23T00:00:00.000Z',
    }))
    vi.mocked(generateQuotationPdf).mockReturnValue(
      new Promise((resolve) => {
        resolvePdf = resolve
      }),
    )
    vi.mocked(getSummaryGrid).mockResolvedValue({
      address: 'A1:H2',
      headers: [
        'SNO',
        'QUOTATION REF',
        'OUTLET NAME',
        'AMOUNT',
        'SCOPE OF WORK',
        'JOB STATUS',
        'HD NO',
        'APPROVAL',
      ],
      rows: [
        [
          1,
          'QTN-COPY',
          'Test Branch',
          25,
          '(Test service)',
          'NOT DONE',
          'AWAITED',
          'AWAITED',
        ],
      ],
      worksheet: 'summry',
    })
    render(<QuotationEntryPage />)

    await user.selectOptions(
      await screen.findByLabelText(/^Branch/),
      testStore.id,
    )
    await user.type(screen.getByLabelText(/QTN #/), 'QTN-COPY')
    await user.type(screen.getByLabelText(/Client Name/), 'Test Client')
    await user.type(screen.getByLabelText(/Region/), 'Test Region')
    await user.type(screen.getByLabelText(/^Description/), 'Test service')
    await user.type(screen.getByLabelText(/Unit Price/), '25')
    await user.click(
      screen.getByRole('button', { name: '1. Save quotation' }),
    )
    await user.click(
      await screen.findByRole('button', { name: '2. Generate PDF' }),
    )

    expect(screen.getByText('Generating summary...')).toBeTruthy()
    resolvePdf?.({
      blob: new Blob(['%PDF-copy'], { type: 'application/pdf' }),
      summaryStatus: 'created',
    })

    const downloadButton = await screen.findByRole('button', {
      name: 'Download Summary Excel',
    })
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull()
    expect(
      screen.getByRole('cell', { name: 'QTN-COPY' }),
    ).toBeTruthy()
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(downloadSummaryWorkbook).toHaveBeenCalledOnce()
    })
    expect(
      await screen.findByText('Summary Excel downloaded successfully.'),
    ).toBeTruthy()
    expect(getSummaryGrid).toHaveBeenCalled()
    expect(generateQuotationPdf).toHaveBeenCalledOnce()
    expect(createQuotation).toHaveBeenCalledOnce()
  })

  it('saves a manual client name and generates the confirmed PDF', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
    vi.mocked(createQuotation).mockImplementation(async (payload) => ({
      ...payload,
      id: 'quotation-id',
      grandTotal: 25,
      status: 'DRAFT',
      pdfGeneratedAt: null,
      transferredAt: null,
      createdAt: '2026-07-23T00:00:00.000Z',
    }))
    vi.mocked(generateQuotationPdf).mockResolvedValue({
      blob: new Blob(['%PDF-test'], { type: 'application/pdf' }),
      summaryStatus: 'created',
    })
    vi.mocked(transferQuotationToFinancial).mockResolvedValue({
      status: 'TRANSFERRED',
      transferredAt: '2026-07-23T01:00:00.000Z',
      financialStatus: 'created',
    })
    render(<QuotationEntryPage />)

    expect(
      (
        screen.getByRole('button', {
          name: '2. Generate PDF',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: '3. Print PDF',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: '4. Transfer to Financial',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)

    await user.selectOptions(
      await screen.findByLabelText(/^Branch/),
      testStore.id,
    )
    await user.type(screen.getByLabelText(/QTN #/), 'QTN-100')
    await user.type(screen.getByLabelText(/Client Name/), "McDonald's")
    await user.type(screen.getByLabelText(/Region/), 'North Region')
    await user.type(screen.getByLabelText(/^Description/), 'Test service')
    await user.type(screen.getByLabelText(/Unit Price/), '25')
    await user.click(
      screen.getByRole('button', { name: '1. Save quotation' }),
    )

    const generateButton = await screen.findByRole('button', {
      name: '2. Generate PDF',
    })
    expect(vi.mocked(createQuotation).mock.calls[0][0].clientName).toBe(
      "McDonald's",
    )

    await user.click(generateButton)

    await waitFor(() => {
      expect(generateQuotationPdf).toHaveBeenCalledWith('quotation-id')
      expect(
        screen.getByText(
          'PDF generated successfully. Summary logged successfully.',
        ),
      ).toBeTruthy()
    })
    expect(window.confirm).toHaveBeenCalledOnce()
    expect(
      screen.getAllByRole('link', { name: 'Download PDF' }).length,
    ).toBeGreaterThan(0)
    expect(
      (
        screen.getByRole('button', {
          name: '3. Print PDF',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)

    const transferButton = screen.getByRole('button', {
      name: '4. Transfer to Financial',
    })
    expect((transferButton as HTMLButtonElement).disabled).toBe(false)
    await user.click(transferButton)

    await waitFor(() => {
      expect(transferQuotationToFinancial).toHaveBeenCalledWith(
        'quotation-id',
      )
      expect(
        screen.getByText('Transferred to Financial successfully.'),
      ).toBeTruthy()
    })
    expect(
      (
        screen.getByRole('button', {
          name: '4. Transferred',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  }, 15_000)

  it('resumes a pending Financial transfer after page refresh', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(listRecentQuotations).mockResolvedValue([
      {
        id: 'pending-quotation-id',
        qtnNo: 'QTN-PENDING',
        storeId: testStore.id,
        grandTotal: 1_999.99,
        status: 'PDF_GENERATED',
        pdfGeneratedAt: '2026-07-23T01:00:00.000Z',
        transferredAt: null,
        createdAt: '2026-07-23T00:00:00.000Z',
      },
    ])
    vi.mocked(transferQuotationToFinancial).mockResolvedValue({
      status: 'TRANSFERRED',
      transferredAt: '2026-07-23T02:00:00.000Z',
      financialStatus: 'created',
    })

    render(<QuotationEntryPage />)

    expect(await screen.findByText('QTN-PENDING')).toBeTruthy()
    await user.click(
      screen.getByRole('button', { name: 'Transfer to Financial' }),
    )

    await waitFor(() => {
      expect(transferQuotationToFinancial).toHaveBeenCalledWith(
        'pending-quotation-id',
      )
      expect(
        screen.getByText(
          'QTN-PENDING transferred to Financial successfully.',
        ),
      ).toBeTruthy()
      expect(
        screen.getByText(
          'No generated quotations are waiting for Financial transfer.',
        ),
      ).toBeTruthy()
    })
  })
})
