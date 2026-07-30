import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createQuotationFieldOption,
  deleteQuotationFieldOption,
  listQuotationFieldOptions,
  updateQuotationFieldOption,
} from '../api/settings'
import type { QuotationFieldOption } from '../types/settings'
import { SettingsPage } from './SettingsPage'

vi.mock('../api/settings', () => ({
  createQuotationFieldOption: vi.fn(),
  deleteQuotationFieldOption: vi.fn(),
  listQuotationFieldOptions: vi.fn(),
  updateQuotationFieldOption: vi.fn(),
}))

const existingOption: QuotationFieldOption = {
  id: 'option-id',
  fieldKey: 'qtn_no',
  optionValue: 'QTN-100',
  sortOrder: 0,
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.mocked(listQuotationFieldOptions).mockResolvedValue([existingOption])
    vi.mocked(createQuotationFieldOption).mockImplementation(async (input) => ({
      ...input,
      id: 'created-option-id',
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedAt: '2026-07-30T00:00:00.000Z',
    }))
    vi.mocked(updateQuotationFieldOption).mockImplementation(
      async (id, input) => ({
        ...input,
        id,
        createdAt: existingOption.createdAt,
        updatedAt: '2026-07-30T01:00:00.000Z',
      }),
    )
    vi.mocked(deleteQuotationFieldOption).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows all seven configurable fields and manages their values', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    expect(await screen.findByText('QTN-100')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'QTN #' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Job #' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Unit' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Client Name' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Region' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Intro line 1' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Intro line 2' })).toBeTruthy()

    const regionInput = screen.getByLabelText('Add Region value')
    await user.type(regionInput, 'North Region')
    await user.click(
      within(regionInput.closest('form') as HTMLFormElement).getByRole(
        'button',
        { name: 'Add' },
      ),
    )

    await waitFor(() => {
      expect(createQuotationFieldOption).toHaveBeenCalledWith({
        fieldKey: 'region',
        optionValue: 'North Region',
        sortOrder: 0,
      })
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Edit QTN # option QTN-100',
      }),
    )
    const editValue = screen.getByLabelText('Edit QTN # value')
    await user.clear(editValue)
    await user.type(editValue, 'QTN-101')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(updateQuotationFieldOption).toHaveBeenCalledWith('option-id', {
        fieldKey: 'qtn_no',
        optionValue: 'QTN-101',
        sortOrder: 0,
      })
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Delete QTN # option QTN-101',
      }),
    )

    await waitFor(() => {
      expect(deleteQuotationFieldOption).toHaveBeenCalledWith('option-id')
    })
    expect(window.confirm).toHaveBeenCalledOnce()
  })
})
