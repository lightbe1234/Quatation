import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildSummaryTableHtml,
  buildTabularText,
  copyTabularData,
  type ClipboardCell,
} from './clipboard'

const summaryRows: ClipboardCell[][] = [
  [
    'SNO',
    'QUOTATION REF',
    'OUTLET NAME',
    'AMOUNT',
    'SCOPE OF WORK',
    'JOB STATUS',
    'HD NO',
    'APPROVAL',
  ],
  [
    1,
    'QTN-MCD-4408-26',
    'G-31 1830274',
    2850,
    '(SUPPLY & INSTALLATION)',
    'NOT DONE',
    'AWAITED',
    'AWAITED',
  ],
]

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('tabular clipboard formatting', () => {
  it('keeps a plain tab/newline representation for spreadsheet cells', () => {
    expect(buildTabularText(summaryRows)).toBe(
      'SNO\tQUOTATION REF\tOUTLET NAME\tAMOUNT\tSCOPE OF WORK\tJOB STATUS\tHD NO\tAPPROVAL\n1\tQTN-MCD-4408-26\tG-31 1830274\t2850\t(SUPPLY & INSTALLATION)\tNOT DONE\tAWAITED\tAWAITED',
    )
  })

  it('builds the complete formatted two-row Summary table', () => {
    const html = buildSummaryTableHtml(summaryRows)

    expect(html).toContain('<table')
    expect(html).toContain('background-color:#4f7f2b')
    expect(html).toContain('color:#ffffff')
    expect(html).toContain('border:1px solid #111827')
    expect(html).toContain('QTN-MCD-4408-26')
    expect(html.match(/<tr>/g)).toHaveLength(2)
    expect(html.match(/<th /g)).toHaveLength(8)
    expect(html.match(/<td /g)).toHaveLength(8)
  })

  it('writes HTML and plain-text clipboard representations together', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    class TestClipboardItem {
      readonly data: Record<string, Blob>

      constructor(data: Record<string, Blob>) {
        this.data = data
      }
    }

    vi.stubGlobal('ClipboardItem', TestClipboardItem)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText },
    })

    await copyTabularData(summaryRows, { format: 'summary' })

    expect(write).toHaveBeenCalledOnce()
    expect(writeText).not.toHaveBeenCalled()
    const clipboardItem = write.mock.calls[0][0][0] as TestClipboardItem
    expect(Object.keys(clipboardItem.data).sort()).toEqual([
      'text/html',
      'text/plain',
    ])
  })
})
