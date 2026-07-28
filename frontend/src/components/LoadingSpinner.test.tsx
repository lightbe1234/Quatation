import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingSpinner } from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders an animated, decorative progress icon', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('svg')

    expect(spinner?.classList.contains('animate-spin')).toBe(true)
    expect(spinner?.getAttribute('aria-hidden')).toBe('true')
  })
})
