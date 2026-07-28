import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { QuotationWorkflowProgress } from './QuotationWorkflowProgress'

afterEach(cleanup)

describe('QuotationWorkflowProgress', () => {
  it.each([
    {
      hasPdf: false,
      status: undefined,
      currentStep: 'SaveSupabase draft',
    },
    {
      hasPdf: false,
      status: 'DRAFT',
      currentStep: 'GeneratePDF + summary',
    },
    {
      hasPdf: true,
      status: 'PDF_GENERATED',
      currentStep: 'TransferFinancial ledger',
    },
    {
      hasPdf: true,
      status: 'TRANSFERRED',
      currentStep: 'TransferFinancial ledger',
    },
  ])(
    'shows the current workflow step for $status',
    ({ hasPdf, status, currentStep }) => {
      const { container } = render(
        <QuotationWorkflowProgress hasPdf={hasPdf} status={status} />,
      )

      expect(
        container
          .querySelector('[aria-current="step"]')
          ?.textContent?.endsWith(currentStep),
      ).toBe(true)
    },
  )
})
