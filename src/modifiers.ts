import type { DictEntry } from './searcher'

type DictTuple = [d: DictEntry[], isFinal: boolean | undefined]
type DictEntriesFilter = (dictEntries: DictEntry[]) => DictTuple

function createModifier(replaceRegex: RegExp, filter: DictEntriesFilter) {
  return (capture: string) => {
    let isMatch = false
    const refinedCapture = capture
      .replace(replaceRegex, () => ((isMatch = true), ' '))
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
