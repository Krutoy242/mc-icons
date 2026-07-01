/**
 * Small, dependency-free replacements for the handful of lodash helpers the
 * project relied on. Each mirrors lodash's observable behaviour for the inputs
 * we actually pass it.
 */

/** Split `array` into groups of at most `size` elements. */
export function chunk<T>(array: readonly T[], size: number): T[][] {
  if (size < 1)
    return []
  const out: T[][] = []
  for (let i = 0; i < array.length; i += size)
    out.push(array.slice(i, i + size))
  return out
}

/** Keep the first element for each distinct `iteratee` value, preserving order. */
export function uniqBy<T>(array: readonly T[], iteratee: (value: T) => unknown): T[] {
  const seen = new Set<unknown>()
  const out: T[] = []
  for (const item of array) {
    const key = iteratee(item)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

/** Count occurrences grouped by the (stringified) `iteratee` value. */
export function countBy<T>(array: readonly T[], iteratee: (value: T) => unknown): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of array) {
    const key = String(iteratee(item))
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

/** Escape a string so it can be used literally inside a RegExp. */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
