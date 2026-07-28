import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStore,
  deleteStore,
  listStores,
  updateStore,
} from '../api/stores'
import type { Store } from '../types/store'
import { StoresPage } from './StoresPage'

vi.mock('../api/stores', () => ({
  createStore: vi.fn(),
  deleteStore: vi.fn(),
  listStores: vi.fn(),
  updateStore: vi.fn(),
}))

const existingStore: Store = {
  id: 'store-id',
  storeNo: '1830120',
  storeName: 'Existing Store',
  contactName: 'Existing Contact',
  branch: 'Existing Branch',
  branchId: 'BRN-EXISTING',
  region: 'Legacy Region',
  clientName: 'Legacy Client',
  createdAt: '2026-07-23T00:00:00.000Z',
}

describe('StoresPage', () => {
  beforeEach(() => {
    vi.mocked(listStores).mockResolvedValue([existingStore])
    vi.mocked(createStore).mockResolvedValue({
      ...existingStore,
      id: 'new-store-id',
      storeNo: 'BRN-NEW',
      storeName: 'New Branch',
      contactName: 'New Contact',
      branch: 'New Branch',
      branchId: 'BRN-NEW',
      region: null,
      clientName: null,
    })
    vi.mocked(updateStore).mockReset()
    vi.mocked(deleteStore).mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('collects only the active store fields and clears unused metadata', async () => {
    const user = userEvent.setup()
    render(<StoresPage />)

    await screen.findByText('Existing Branch')

    expect(screen.queryByLabelText('Region')).toBeNull()
    expect(screen.queryByLabelText('Client Name')).toBeNull()
    expect(screen.queryByText('Legacy Region')).toBeNull()
    expect(screen.getByText('BRN-EXISTING')).toBeTruthy()

    await user.type(screen.getAllByLabelText(/^Branch/)[0], 'New Branch')
    await user.type(screen.getByLabelText(/Branch ID/), 'BRN-NEW')
    await user.type(screen.getByLabelText('Mr./Ms.'), 'New Contact')
    await user.click(screen.getByRole('button', { name: 'Add store' }))

    await waitFor(() => {
      expect(createStore).toHaveBeenCalledWith({
        storeNo: 'BRN-NEW',
        storeName: 'New Branch',
        contactName: 'New Contact',
        branch: 'New Branch',
        branchId: 'BRN-NEW',
        region: null,
        clientName: null,
      })
    })
  })

  it('clears an old load error after stores load successfully', async () => {
    vi.mocked(listStores)
      .mockRejectedValueOnce(new Error('The store database operation failed'))
      .mockResolvedValueOnce([existingStore])
    const { unmount } = render(<StoresPage />)

    expect(
      await screen.findByText('The store database operation failed'),
    ).toBeTruthy()

    unmount()
    render(<StoresPage />)

    await screen.findByText('Existing Branch')

    expect(
      screen.queryByText('The store database operation failed'),
    ).toBeNull()
  })
})
