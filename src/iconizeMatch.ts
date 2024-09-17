import type { DictEntry } from './searcher'
import type { Unclear } from './unclear'
import { getIcon } from './getIcon'
import { refine } from './modifiers'
import { asset } from './tool/assets'

type Promisable<T> = T | Promise<T>

export interface RgxExecIconMatch extends RegExpMatchArray {
  index: number
  input: string
  groups: {
    capture: string
    tail?: string
    option?: string
  }
}

export const capture_rgx
  = /\[(?<capture>[^\][]+)\](?!\()(?<tail>\s+\((?<option>[^)]+)\))?/g

function filterByOption(result: DictEntry[], option?: string): DictEntry[] {
  if (!option)
    return result

  // This is number
  if (/^\d+$/.test(option)) {
    return result.filter(d => d.meta === option)
  }

  // This option is mod name or Abbr
  const option_low = option.toLocaleLowerCase()
  return result.filter(
    d =>
      d.modAbbr.startsWith(option_low)
      || d.modname.toLocaleLowerCase().startsWith(option_low)
      || d.source.startsWith(option_low),
  )
}

export async function iconizeMatch(
  match: RgxExecIconMatch,
  trieSearch: (s: string) => DictEntry[],
  unclear: Unclear,
  levinshteinResolver: (capture: string) => DictEntry[],
  getByCommandString: (capture: string) => DictEntry[] | undefined,
  getByID: (id: string) => DictEntry[] | undefined,
): Promise<DictEntry[] | undefined> {
  /**
   * Full capture inside [] and without changes, like (Every)
   */
  const rawCapture = match.groups.capture

  /**
   * Options that comes after capture
   * @example [Capture] (option)
   */
  const { option } = match.groups

  // Skip if empty (or Markdown list)
  if (!rawCapture.trim() || /^x$/i.test(rawCapture))
    return

  /**
   * Capture inside [], removed wildcards
   * @example [Capture] (option)
   */
  const { capture, modifierFilter } = refine(rawCapture)

  // Filters that could help reduce result variants
  const filterSteps: ((
    d: DictEntry[]
  ) => Promisable<[DictEntry[], boolean | undefined]>)[] = [
    d => [d, false],
    d => [filterByOption(d, option), false],
    d => [[...new Map(d.map(e => [getIcon(e), e])).values()], false], // Same image filter
    d => modifierFilter(d),
  ]

  let result: DictEntry[] = []
  for await (const list of attempts()) {
    if (!list?.length)
      continue

    result = list
    let final
    for (const filter of filterSteps) {
      ;[result, final] = await filter(result)
      if (result.length === 1 || final)
        return result
    }

    // Attempts found items, but we still have too many
    if (result.length > 1) {
      const resolved = await unclear.resolve(rawCapture, result, match)
      return resolved ? [resolved] : undefined
    }
  }

  // result.length === 0
  return undefined

  async function* attempts() {
    // Command string [<minecraft:coal>]
    yield getByCommandString(capture)

    // Exact lowercase name [Coal]
    const capture_low = capture.toLowerCase()
    const exactName = asset.names_low[capture_low]
    if (exactName) {
      const exacts = asset.names[exactName]
        .map(getByID)
        .filter((d): d is DictEntry[] => !!d)
        .flat()

      // Exact one item from Minecraft - this probably what user want
      const fromMC = exacts.filter(r => r.source === 'minecraft')
      if (fromMC.length === 1)
        yield fromMC
      yield exacts
    }

    // Trie search [NanoSuit]
    // Ends here if result have members
    yield trieSearch(capture)

    yield levinshteinResolver(capture)
  }
}
