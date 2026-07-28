import { MicrosoftAuthService } from '../auth/microsoftAuthService.js'
import { readWorkbookConnection } from '../graph/connectionStore.js'
import { getSupabaseClient } from '../lib/supabase.js'

const qtnNo = process.argv[2]?.trim()

if (!qtnNo) {
  throw new Error('Usage: verifyQuotationByQtn.ts <QTN number>')
}

const { data: quotation, error } = await getSupabaseClient()
  .from('quotations')
  .select(
    'id,qtn_no,status,pdf_generated_at,transferred_at,grand_total,created_at',
  )
  .eq('qtn_no', qtnNo)
  .maybeSingle()

if (error) {
  throw new Error(`Could not read quotation: ${error.message}`)
}

const connection = await readWorkbookConnection()

if (!connection) {
  throw new Error('Workbook connection is not cached')
}

const driveItemId = connection.driveItemId
const accessToken = await new MicrosoftAuthService().getAccessToken()

async function readWorksheet(name: string) {
  const worksheet = encodeURIComponent(name)
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${driveItemId}/workbook/worksheets/${worksheet}/usedRange(valuesOnly=true)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) {
    throw new Error(
      `Could not read ${name}; Graph returned ${response.status}`,
    )
  }

  return (await response.json()) as {
    values?: unknown[][]
  }
}

const normalizedQtn = qtnNo.toLowerCase()
const [summary, financial] = await Promise.all([
  readWorksheet('summry'),
  readWorksheet('financial '),
])
const summaryRows = (summary.values ?? []).filter(
  (row, index) =>
    index > 0 &&
    String(row[1] ?? '').trim().toLowerCase() === normalizedQtn,
)
const financialRows = (financial.values ?? []).filter(
  (row, index) =>
    index > 0 &&
    String(row[2] ?? '').trim().toLowerCase() === normalizedQtn,
)

console.log(
  JSON.stringify(
    {
      quotation,
      matchingSummaryRowCount: summaryRows.length,
      summaryRow: summaryRows[0] ?? null,
      matchingFinancialRowCount: financialRows.length,
      financialRow: financialRows[0] ?? null,
    },
    null,
    2,
  ),
)
