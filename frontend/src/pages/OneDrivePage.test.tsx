import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getOneDriveStatus,
  getSummaryGrid,
} from '../api/oneDrive'
import { OneDrivePage } from './OneDrivePage'

vi.mock('../api/oneDrive', () => ({
  getConnectOneDriveUrl: vi.fn(() => '/connect-onedrive'),
  getOneDriveStatus: vi.fn(),
  getSummaryGrid: vi.fn(),
  inspectTestCell: vi.fn(),
  runTestCell: vi.fn(),
}))

describe('OneDrivePage', () => {
  beforeEach(() => {
    vi.mocked(getOneDriveStatus).mockResolvedValue({
      connected: true,
      workbook: {
        name: 'Web app.xlsx',
        connectedAt: '2026-07-23T00:00:00.000Z',
      },
    })
    vi.mocked(getSummaryGrid).mockResolvedValue({
      address: 'A1:H2',
      worksheet: 'summry',
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
          'QTN-1',
          'Store 1',
          25,
          '(Service)',
          'NOT DONE',
          null,
          'AWAITED',
        ],
      ],
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows a selectable Summary grid without Summary PDF controls', async () => {
    render(
      <MemoryRouter>
        <OneDrivePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(getSummaryGrid).toHaveBeenCalledOnce()
    })
    expect(screen.getByLabelText('Cell B2: QTN-1')).toBeTruthy()
    expect(
      screen.getByLabelText('Selectable Summary worksheet grid'),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /Summary PDF/ }),
    ).toBeNull()
    expect(
      screen.queryByRole('link', { name: /Summary PDF/ }),
    ).toBeNull()
  })
})
