import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectableDataGrid } from './SelectableDataGrid'

describe('SelectableDataGrid', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    writeText.mockReset()
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
  })

  afterEach(cleanup)

  it('copies a click-dragged rectangle as tab-separated rows', async () => {
    render(
      <SelectableDataGrid
        headers={['A', 'B', 'C']}
        label="Test grid"
        rows={[
          ['r1a', 'r1b', 'r1c'],
          ['r2a', 'r2b', 'r2c'],
        ]}
      />,
    )

    const copyButton = screen.getByRole('button', { name: 'Copy' })
    expect((copyButton as HTMLButtonElement).disabled).toBe(false)

    fireEvent.mouseDown(screen.getByLabelText('Cell B2: r1b'))
    fireEvent.mouseEnter(screen.getByLabelText('Cell C3: r2c'))
    fireEvent.mouseUp(document)
    expect((copyButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('r1b\tr1c\nr2b\tr2c')
    })
    expect(screen.getByText('4 cells copied.')).toBeTruthy()
  })

  it('auto-selects and copies the entire grid without user selection', async () => {
    render(
      <SelectableDataGrid
        headers={['A', 'B']}
        label="Auto-selected grid"
        rows={[
          ['first', 'second'],
          ['third', 'fourth'],
        ]}
      />,
    )

    expect(
      screen.getByText('All 6 cells selected automatically'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'A\tB\nfirst\tsecond\nthird\tfourth',
      )
    })
  })

  it('can auto-select only data rows while reusing the same copy action', async () => {
    render(
      <SelectableDataGrid
        defaultSelection="data"
        headers={['A', 'B']}
        label="Data-selected grid"
        rows={[
          ['first', 'second'],
          ['third', 'fourth'],
        ]}
      />,
    )

    expect(
      screen.getByText('All 4 data cells selected automatically'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'first\tsecond\nthird\tfourth',
      )
    })
  })


  it('supports Shift+Click selection and Ctrl+C', async () => {
    render(
      <SelectableDataGrid
        headers={['A', 'B']}
        label="Keyboard copy grid"
        rows={[
          ['first', 'second'],
          ['third', 'fourth'],
        ]}
      />,
    )

    fireEvent.mouseDown(screen.getByLabelText('Cell A2: first'))
    fireEvent.mouseUp(document)
    fireEvent.mouseDown(screen.getByLabelText('Cell B3: fourth'), {
      shiftKey: true,
    })
    fireEvent.keyDown(screen.getByLabelText('Keyboard copy grid'), {
      ctrlKey: true,
      key: 'c',
    })

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('first\tsecond\nthird\tfourth')
    })
  })
})
