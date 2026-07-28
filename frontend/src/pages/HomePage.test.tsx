import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('links to every available quotation workflow area', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(
      screen
        .getByRole('link', { name: /Create quotation/ })
        .getAttribute('href'),
    ).toBe('/quotations/new')
    expect(
      screen
        .getByRole('link', { name: 'Manage stores' })
        .getAttribute('href'),
    ).toBe('/stores')
    expect(
      screen
        .getByRole('link', { name: 'Check OneDrive' })
        .getAttribute('href'),
    ).toBe('/onedrive')
    expect(screen.getAllByText('Ready')).toHaveLength(3)
    expect(screen.queryByText('Later')).toBeNull()
  })
})
