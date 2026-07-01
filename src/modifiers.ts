import type { DictEntry } from './searcher'

type DictTuple = [d: DictEntry[], isFinal: boolean | undefined]
type DictEntriesFilter = (dictEntries: DictEntry[]) => DictTuple

function createModifier(replaceRegex: RegExp, filter: DictEntriesFilter) {
  return (capture: string) => {
    let isMatch = false
    const refinedCapture = capture
      .replace(replaceRegex, () => {
        isMatch = true
        return ' '
      })
      .trim()

    if (!isMatch)
      return { refinedCapture }
    return { refinedCapture, filter }
  }
}

const modifiersList = [
  createModifier(/\s*\(Every\)\s*/gi, d => [d, !!d.length]),
  createModifier(/\s*\(Any\)\s*/gi, d => [[d[0]], !!d.length]),
]

/**
 * Strip `(every)`/`(any)` modifiers from a capture and return the leftover text
 * plus a filter that applies the modifier's semantics to the result set.
 * @example Add (every) to get all matching items | [Mossy Wall (every)] => minecraft/cobblestone_wall__1,quark/stonebrick_mossy_wall__0
 * @example Add (any) to pick only the first match | [Mossy Wall (any)] => minecraft/cobblestone_wall__1
 */
export function refine(rawCapture: string) {
  let capture = rawCapture
  const filters = modifiersList
    .map((m) => {
      const { refinedCapture, filter } = m(capture)
      capture = refinedCapture
      return filter
    })
    .filter(Boolean) as DictEntriesFilter[]

  return {
    capture,
    modifierFilter: (d: DictEntry[]) =>
      filters.reduce(
        (acc, filter) => {
          const [arr, f] = filter(acc[0])
          return [arr, f || acc[1]] as DictTuple
        },
        [d, false] as DictTuple,
      ),
  }
}
