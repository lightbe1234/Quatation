import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const authMocks = vi.hoisted(() => {
  type TestUser = {
    email: string
    id: string
  }
  type SessionResponse = {
    data: { session: { user: TestUser } | null }
    error: { message: string } | null
  }
  type SignInResponse = {
    data: { user: TestUser | null }
    error: { message: string } | null
  }
  const authenticatedSession = {
    user: {
      email: 'shahab@bmscontracting.com',
      id: 'admin-user-id',
    },
  }

  return {
    getSession: vi.fn<() => Promise<SessionResponse>>(() =>
      Promise.resolve({
        data: { session: authenticatedSession },
        error: null,
      }),
    ),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signInWithPassword: vi.fn<() => Promise<SignInResponse>>(() =>
      Promise.resolve({
        data: authenticatedSession,
        error: null,
      }),
    ),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  }
})

vi.mock('./lib/supabaseClient', () => ({
  getSupabaseBrowserClient: () => ({
    auth: authMocks,
  }),
}))

vi.mock('./api/oneDrive', () => ({
  getConnectOneDriveUrl: vi.fn(() => '/connect-onedrive'),
  getOneDriveStatus: vi.fn(),
  getSummaryGrid: vi.fn(),
  inspectTestCell: vi.fn(),
  runTestCell: vi.fn(),
}))

vi.mock('./api/stores', () => ({
  createStore: vi.fn(),
  deleteStore: vi.fn(),
  listStores: vi.fn(() =>
    Promise.resolve([
      {
        id: 'store-id',
        storeNo: '1830120',
        storeName: 'Test Store',
        contactName: 'Test Contact',
        branch: 'Test Branch',
        branchId: 'TEST-BRN',
        region: 'Test Region',
        clientName: 'Test Client',
        createdAt: '2026-07-23T00:00:00.000Z',
      },
    ]),
  ),
  updateStore: vi.fn(),
}))

vi.mock('./api/quotations', () => ({
  createQuotation: vi.fn(),
  generateQuotationPdf: vi.fn(),
  listRecentQuotations: vi.fn(() => Promise.resolve([])),
  transferQuotationToFinancial: vi.fn(),
}))

vi.mock('./api/records', () => ({
  deleteRecordRow: vi.fn(),
  getRecords: vi.fn(() =>
    Promise.resolve({
      financial: {
        address: 'A1:L1',
        headers: [],
        kind: 'financial',
        rows: [],
        worksheet: 'financial ',
      },
    }),
  ),
  updateRecordRow: vi.fn(),
}))

describe('App routes', () => {
  beforeEach(() => {
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: 'shahab@bmscontracting.com',
            id: 'admin-user-id',
          },
        },
      },
      error: null,
    })
    authMocks.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          email: 'shahab@bmscontracting.com',
          id: 'admin-user-id',
        },
      },
      error: null,
    })
    authMocks.signOut.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it.each(['/', '/stores', '/quotations/new', '/records', '/onedrive'])(
    'redirects protected page %s to login when signed out',
    async (path) => {
    authMocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Manage service outlets' })).toBeNull()
      cleanup()
    },
  )

  it('signs in with username credentials and restores access', async () => {
    const user = userEvent.setup()
    authMocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/stores']}>
        <App />
      </MemoryRouter>,
    )

    await user.type(
      await screen.findByLabelText(/Email or username/),
      'shahab',
    )
    await user.type(screen.getByLabelText(/Password/), '1964')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'shahab@bmscontracting.com',
        password: '1964',
      })
    })
  })

  it('shows a clear error for wrong credentials', async () => {
    const user = userEvent.setup()
    authMocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })
    authMocks.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )

    await user.type(
      await screen.findByLabelText(/Email or username/),
      'shahab',
    )
    await user.type(screen.getByLabelText(/Password/), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Email or password is incorrect.'),
    ).toBeTruthy()
  })

  it('logs out from the top navigation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(authMocks.signOut).toHaveBeenCalledOnce()
  })

  it('restores Records navigation with the Financial-only page', async () => {
    render(
      <MemoryRouter initialEntries={['/records']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Records' })).toBeTruthy()
    expect(
      await screen.findByRole('heading', { name: 'Records' }),
    ).toBeTruthy()
    expect(screen.getByText('Financial Records')).toBeTruthy()
    expect(screen.queryByText('Summary Records')).toBeNull()
  })

  it(
    'keeps an in-progress quotation draft while navigating between pages',
    async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter initialEntries={['/quotations/new']}>
          <App />
        </MemoryRouter>,
      )

      await screen.findByRole('option', {
        name: 'Test Branch - TEST-BRN - Test Contact',
      })
      const storeSelect = await screen.findByLabelText(/^Branch/)
      await user.selectOptions(storeSelect, 'store-id')
      await user.type(screen.getByLabelText(/QTN #/), 'QTN-NAVIGATION')
      await user.type(screen.getByLabelText(/Region/), 'Persistent Region')
      await user.type(screen.getByLabelText('Subject'), 'Persistent subject')
      await user.type(
        screen.getByLabelText(/^Description/),
        'First persistent line',
      )
      await user.type(screen.getByLabelText(/Unit Price/), '125')
      await user.click(screen.getByRole('button', { name: '+ Add Line' }))

      const descriptions = screen.getAllByLabelText(/Description/)
      await user.type(descriptions[1], 'Second persistent line')

      await user.click(screen.getByRole('link', { name: 'Stores' }))
      await screen.findByRole('heading', { name: 'Manage service outlets' })
      await user.click(screen.getByRole('link', { name: 'New Quotation' }))

      await waitFor(() => {
        expect(
          (screen.getByLabelText(/QTN #/) as HTMLInputElement).value,
        ).toBe('QTN-NAVIGATION')
      })
      expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe(
        'Persistent subject',
      )
      expect(
        (screen.getByLabelText(/^Branch/) as HTMLSelectElement).value,
      ).toBe('store-id')
      expect((screen.getByLabelText(/Region/) as HTMLInputElement).value).toBe(
        'Persistent Region',
      )
      expect(screen.getAllByLabelText(/Description/)).toHaveLength(2)
      expect(
        (screen.getAllByLabelText(/Description/)[0] as HTMLTextAreaElement)
          .value,
      ).toBe('First persistent line')
      expect(
        (screen.getAllByLabelText(/Description/)[1] as HTMLTextAreaElement)
          .value,
      ).toBe('Second persistent line')
      expect(
        (screen.getAllByLabelText(/Unit Price/)[0] as HTMLInputElement).value,
      ).toBe('125')
    },
    15_000,
  )
})
