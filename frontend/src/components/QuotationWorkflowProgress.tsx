type QuotationWorkflowProgressProps = {
  hasPdf: boolean
  status?: string
}

const steps = [
  {
    label: 'Save',
    detail: 'Supabase draft',
  },
  {
    label: 'Generate',
    detail: 'PDF + summary',
  },
  {
    label: 'Review',
    detail: 'Download or print',
  },
  {
    label: 'Transfer',
    detail: 'Financial ledger',
  },
]

export function QuotationWorkflowProgress({
  hasPdf,
  status,
}: QuotationWorkflowProgressProps) {
  const completedSteps =
    status === 'TRANSFERRED'
      ? 4
      : hasPdf
        ? 3
        : status === 'PDF_GENERATED'
          ? 2
          : status === 'DRAFT'
            ? 1
            : 0

  return (
    <ol
      aria-label="Quotation workflow progress"
      className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-4"
    >
      {steps.map((step, index) => {
        const number = index + 1
        const isComplete = number <= completedSteps
        const isCurrent =
          number === Math.min(completedSteps + 1, steps.length)

        return (
          <li
            aria-current={isCurrent ? 'step' : undefined}
            className={`relative flex min-h-16 items-center gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0 ${
              isCurrent ? 'bg-blue-50/70' : ''
            }`}
            key={step.label}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isComplete
                  ? 'bg-bms-blue text-white'
                  : isCurrent
                    ? 'border-2 border-bms-blue bg-white text-bms-blue'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {isComplete ? (
                <svg
                  aria-hidden="true"
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="m5 12 4 4L19 6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  />
                </svg>
              ) : (
                number
              )}
            </span>
            <span className="min-w-0">
              <span
                className={`block text-sm font-semibold ${
                  isComplete || isCurrent
                    ? 'text-slate-950'
                    : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {step.detail}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
