export function graphValuesMatch(expected: unknown, actual: unknown) {
  if (expected === '') {
    return actual === '' || actual === null || actual === undefined
  }

  if (typeof expected === 'number') {
    return Number(actual) === expected
  }

  return String(actual ?? '') === String(expected)
}

export function rangeValuesMatch(
  expectedValues: unknown[][],
  actualValues: unknown[][] | undefined,
) {
  return expectedValues.every((row, rowIndex) =>
    row.every((expected, columnIndex) =>
      graphValuesMatch(
        expected,
        actualValues?.[rowIndex]?.[columnIndex],
      ),
    ),
  )
}

type VerificationOptions = {
  attempts?: number
  wait?: (attempt: number) => Promise<void>
}

async function defaultWait(attempt: number) {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.min(250 * attempt, 2_000)),
  )
}

export async function waitForExpectedRange(
  readRange: () => Promise<unknown[][] | undefined>,
  expectedValues: unknown[][],
  options: VerificationOptions = {},
) {
  const attempts = options.attempts ?? 8
  const wait = options.wait ?? defaultWait

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (rangeValuesMatch(expectedValues, await readRange())) {
      return true
    }

    if (attempt < attempts) {
      await wait(attempt)
    }
  }

  return false
}
