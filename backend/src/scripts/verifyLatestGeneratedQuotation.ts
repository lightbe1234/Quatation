import { MicrosoftAuthService } from '../auth/microsoftAuthService.js'
import { readWorkbookConnection } from '../graph/connectionStore.js'
import { getSupabaseClient } from '../lib/supabase.js'

const { data: quotations, error } = await getSupabaseClient()
  .from('quotations')
  .select('id,qtn_no,status,pdf_generated_at,grand_total,created_at')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  throw new Error(`Could not read quotations: ${error.message}`)
}

const latestGenerated = quotations.find(
  (quotation) => quotation.status === 'PDF_GENERATED',
)

if (!latestGenerated) {
  throw new Error('No generated quotation was found in Supabase')
}

const connection = await readWorkbookConnection()

if (!connection) {
  throw new Error('Workbook connection is not cached')
}

const accessToken = await new MicrosoftAuthService().getAccessToken()
const worksheet = encodeURIComponent('summry')
const usedRangeResponse = await fetch(
  `https://graph.microsoft.com/v1.0/me/drive/items/${connection.driveItemId}/workbook/worksheets/${worksheet}/usedRange(valuesOnly=true)`,
  {
    headers: { Authorization: `Bearer ${accessToken}` },
  },
)

if (!usedRangeResponse.ok) {
  throw new Error(
    `Could not read summry; Graph returned ${usedRangeResponse.status}`,
  )
}

const usedRange = (await usedRangeResponse.json()) as {
  values?: unknown[][]
}
const matchingRows = (usedRange.values ?? []).filter(
  (row, index) =>
    index > 0 &&
    String(row[1] ?? '').trim().toLowerCase() ===
      latestGenerated.qtn_no.trim().toLowerCase(),
)

console.log(
  JSON.stringify(
    {
      quotation: latestGenerated,
      matchingSummaryRowCount: matchingRows.length,
      summaryRow: matchingRows[0] ?? null,
    },
    null,
    2,
  ),
)
