import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteRecordRow,
  getRecords,
  updateRecordRow,
  type WorkbookRecordGrid,
} from '../api/records'
import { RecordsPage } from './RecordsPage'

vi.mock('../api/records', () => ({
  deleteRecordRow: vi.fn(),
  getRecords: vi.fn(),
  updateRecordRow: vi.fn(),
}))

const financial: WorkbookRecordGrid = {
  address: 'A1:L2',
  headers: [
    'Specialist',
    'Approval Status',
    'QTN/NO',
    'Store No.',
    'Inv/Type',
    'Job Report',
    'Product Description',
    'Region',
    'QTY',
    'Unit',
    'Before Approval',
    'After Approval',
  ],
  kind: 'financial',
  rows: [
    {
      rowNumber: 2,
      values: [
        'Specialist',
        'Pending',
        'QTN-1',
        '1830120',
        'OPEX',
        'JOB-1',
        '(Service)',
        'North',
        1,
        'Unit',
        100,
        '',
      ],
    },
  ],
  worksheet: 'financial ',
}

describe('RecordsPage', () => {
  beforeEach(() => {
    vi.mocked(getRecords).mockResolvedValue({ financial })
    vi.mocked(updateRecordRow).mockResolvedValue(financial)
    vi.mocked(deleteRecordRow).mockResolvedValue({
      ...financial,
      rows: [],
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows Financial Records and no Summary Records section', async () => {
    render(<RecordsPage />)

    expect(await screen.findByText('QTN-1')).toBeTruthy()
    expect(screen.getByText('Financial Records')).toBeTruthy()
    expect(screen.queryByText('Summary Records')).toBeNull()
  })

  it('edits and updates a Financial row', async () => {
    const user = userEvent.setup()
    render(<RecordsPage />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const approval = screen.getByLabelText(
      'Financial Records row 2 Approval Status',
    )
    await user.clear(approval)
    await user.type(approval, 'Approved')
    await user.click(screen.getByRole('button', { name: 'Update' }))

    await waitFor(() => {
      expect(updateRecordRow).toHaveBeenCalledWith(
        2,
        expect.arrayContaining(['Approved']),
      )
    })
    expect(
      screen.getByText('Financial Records row 2 updated.'),
    ).toBeTruthy()
  })

  it('deletes a confirmed Financial row', async () => {
    const user = userEvent.setup()
    render(<RecordsPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(deleteRecordRow).toHaveBeenCalledWith(2)
    })
    expect(
      screen.getByText('Financial Records row 2 deleted.'),
    ).toBeTruthy()
  })
})
