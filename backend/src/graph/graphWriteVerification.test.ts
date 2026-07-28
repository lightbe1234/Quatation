import { describe, expect, it, vi } from 'vitest'
import {
  rangeValuesMatch,
  waitForExpectedRange,
} from './graphWriteVerification.js'

describe('Graph write verification', () => {
  it('accepts equivalent numeric and blank Graph values', () => {
    expect(
      rangeValuesMatch(
        [[8, 'QTN-1', '', 2000]],
        [['8', 'QTN-1', null, 2000]],
      ),
    ).toBe(true)
  })

  it('retries a stale read until the expected row is visible', async () => {
    const readRange = vi
      .fn<() => Promise<unknown[][] | undefined>>()
      .mockResolvedValueOnce([['old']])
      .mockResolvedValueOnce([['new']])
    const wait = vi.fn(async () => undefined)

    await expect(
      waitForExpectedRange(readRange, [['new']], { wait }),
    ).resolves.toBe(true)
    expect(readRange).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledOnce()
  })

  it('reports failure after the configured number of attempts', async () => {
    const readRange = vi.fn(async () => [['stale']])
    const wait = vi.fn(async () => undefined)

    await expect(
      waitForExpectedRange(readRange, [['expected']], {
        attempts: 3,
        wait,
      }),
    ).resolves.toBe(false)
    expect(readRange).toHaveBeenCalledTimes(3)
    expect(wait).toHaveBeenCalledTimes(2)
  })
})
