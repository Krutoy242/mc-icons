/**
 * Return the first defined value among the given keys of `obj`,
 * falling back to the first value in insertion order.
 *
 * Used to resolve "definition with fallback metas/nbts" objects where the
 * desired key may be missing and any available variant will do.
 *
 * @example firstOf(stack, '') // stack[''] ?? Object.values(stack)[0]
 * @example firstOf(def, '', 0, '0', '*') // first of those keys, else any
 */
export function firstOf<V>(
  obj: { [key: string]: V } | { [key: number]: V },
  ...keys: (string | number)[]
): V | undefined {
  for (const key of keys) {
    const value = (obj as Record<string, V>)[key]
    if (value !== undefined)
      return value
  }
  return Object.values(obj)[0]
}
