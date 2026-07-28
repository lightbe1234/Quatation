export type ClipboardCell = string | number | boolean | null

type ClipboardTableFormat = 'plain' | 'summary'

type CopyTabularDataOptions = {
  format?: ClipboardTableFormat
}

function clipboardCell(value: ClipboardCell) {
  if (value === null) {
    return ''
  }

  return String(value).replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildTabularText(rows: ClipboardCell[][]) {
  return rows
    .map((row) => row.map(clipboardCell).join('\t'))
    .join('\n')
}

export function buildSummaryTableHtml(rows: ClipboardCell[][]) {
  const columnWidths = [64, 135, 135, 90, 280, 110, 100, 110]
  const tableRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const tag = rowIndex === 0 ? 'th' : 'td'
          const headerStyles =
            'background-color:#4f7f2b;color:#ffffff;font-weight:700;text-transform:uppercase;'
          const dataStyles =
            'background-color:#ffffff;color:#111827;font-weight:600;'
          const width = columnWidths[columnIndex] ?? 110

          return `<${tag} style="border:1px solid #111827;padding:8px 10px;width:${width}px;min-width:${width}px;height:${rowIndex === 0 ? 46 : 72}px;text-align:center;vertical-align:middle;white-space:normal;word-break:normal;font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.25;${rowIndex === 0 ? headerStyles : dataStyles}">${escapeHtml(clipboardCell(value))}</${tag}>`
        })
        .join('')

      return `<tr>${cells}</tr>`
    })
    .join('')

  return `<html><head><meta charset="utf-8"></head><body><table cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;background-color:#ffffff;font-family:Calibri,Arial,sans-serif;">${tableRows}</table></body></html>`
}

async function writeClipboard(text: string, html?: string) {
  if (
    html &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== 'undefined'
  ) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
    return
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.className = 'fixed left-[-9999px] top-0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) {
    throw new Error('Clipboard access is unavailable')
  }
}

export function copyTabularData(
  rows: ClipboardCell[][],
  options: CopyTabularDataOptions = {},
) {
  const text = buildTabularText(rows)
  const html =
    options.format === 'summary'
      ? buildSummaryTableHtml(rows)
      : undefined

  return writeClipboard(text, html)
}
