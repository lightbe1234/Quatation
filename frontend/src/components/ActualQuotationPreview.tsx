import type { Ref } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { EmptyState } from './ui'

type ActualQuotationPreviewProps = {
  frameRef: Ref<HTMLIFrameElement>
  isGenerating: boolean
  pdfUrl?: string
  qtnNo?: string
}

export function ActualQuotationPreview({
  frameRef,
  isGenerating,
  pdfUrl,
  qtnNo,
}: ActualQuotationPreviewProps) {
  const documentIcon = (
    <svg
      aria-hidden="true"
      className="size-7"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 3.75h7.25L19 8.5v11.75H7V3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M14 3.75V9h5M10 13h6M10 16h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-bms-blue">
              Actual Excel sheet
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">
              Quatation preview
            </h3>
          </div>
          {isGenerating ? (
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold text-bms-blue"
              role="status"
            >
              <LoadingSpinner className="size-4" />
              Generating...
            </span>
          ) : pdfUrl && qtnNo ? (
            <a
              className="shrink-0 rounded-lg bg-bms-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
              download={`quotation-${qtnNo}.pdf`}
              href={pdfUrl}
            >
              Download PDF
            </a>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
              Not generated
            </span>
          )}
        </div>
      </div>

      {isGenerating ? (
        <div
          aria-live="polite"
          className="flex min-h-80 flex-col items-center justify-center gap-4 bg-slate-50 px-6 py-10 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-blue-100 text-bms-blue">
            <LoadingSpinner className="size-7" />
          </span>
          <div>
            <p className="font-semibold text-slate-950">
              Building the actual Excel preview
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              Microsoft Graph is writing the confirmed values and rendering
              the Quatation worksheet.
            </p>
          </div>
        </div>
      ) : pdfUrl && qtnNo ? (
        <iframe
          className="h-[46rem] w-full bg-slate-100 xl:h-[54rem]"
          ref={frameRef}
          src={pdfUrl}
          title={`Actual Excel quotation ${qtnNo}`}
        />
      ) : (
        <EmptyState
          description="Save the quotation, then select Generate PDF. The real Quatation worksheet rendered by Microsoft Excel will appear here."
          icon={documentIcon}
          title="No demo preview is shown"
        />
      )}

      <p className="border-t border-slate-200 bg-white px-5 py-3 text-xs leading-5 text-slate-500">
        This panel displays the workbook-rendered PDF, not an HTML
        approximation. Excel is changed only after your confirmation.
      </p>
    </section>
  )
}
