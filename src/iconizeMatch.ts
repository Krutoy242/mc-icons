import { Reducer, TrieSearch } from '@committed/trie-search'
import _ from 'lodash'

import { CommandStrGroups, DictEntry } from './searcher'
import { Unclear } from './unclear'

function escapeRegex(s: string): string {
  return s.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export interface RgxExecIconMatch extends RegExpMatchArray {
  index: number
  input: string
  groups: {
    capture: string
    tail?: string
    option?: string
  }
}

export const capture_rgx =
  /\[(?<capture>[^\][]+)\](?!\()(?<tail>\s+\((?<option>[^)]+)\))?/gim

function getTrieSearch(s: string, subTrie: TrieSearch<DictEntry>): DictEntry[] {
  return subTrie.get(
    s.split(/\s/),
    TrieSearch.UNION_REDUCER as unknown as Reducer<DictEntry>
  )
}

function filterByOption(
  searchResult: DictEntry[],
  option?: string
): DictEntry[] {
  if (!option) return searchResult

  if (/^[0-9]+$/.test(option)) {
    // This is number
    return searchResult.filter((d) => d.meta === option)
  }
  // This option is mod name or Abbr
  const rgx = new RegExp(option, 'i')
  const optLow = option.toLocaleLowerCase()
  return searchResult.filter(
    (d) =>
      rgx.test(d.modAbbr) ||
      d.modname.toLocaleLowerCase().startsWith(optLow) ||
      d.source.startsWith(optLow)
  )
}

type DictEntriesFilter = (dictEntries: DictEntry[]) => DictEntry[]

function createModifier(replaceRegex: RegExp, takeCallback: DictEntriesFilter) {
  return (capture: string) => {
    let isMatch = false
    const unmodifiedCapture = capture
      .replace(replaceRegex, () => ((isMatch = true), ' '))
      .trim()

    const unmodRgx = new RegExp(escapeRegex(unmodifiedCapture), 'i')
    return {
      unmodifiedCapture,
      filter: !isMatch
        ? undefined
        : (dictEntries: DictEntry[]) =>
            takeCallback(dictEntries.filter((d) => unmodRgx.test(d.name))),
    }
  }
}

const modsList = [
  createModifier(/\s*\(Every\)\s*/gi, (d: DictEntry[]) => d),
  createModifier(/\s*\(Any\)\s*/gi, (d: DictEntry[]) => [d[0]]),
]

export async function iconizeMatch(
  match: RgxExecIconMatch,
  trieSearch: TrieSearch<DictEntry>,
  unclear: Unclear,
  levinshteinResolver: (capture: string) => Promise<DictEntry | DictEntry[]>,
  getCommandStringSearch: (groups?: CommandStrGroups) => DictEntry[] | undefined
): Promise<DictEntry | DictEntry[] | undefined> {
  /**
   * Capture inside []
   * @example [Capture] (option)
   */
  let { capture } = match.groups

  /**
   * Options that comes after capture
   * @example [Capture] (option)
   */
  const { option } = match.groups

  /**
   * Full capture inside [] and without changes, like (Every)
   */
  const rawCapture = capture

  // Skip if empty (or Markdown list)
  if (!capture.trim() || /^x$/i.test(capture)) return

  // Remove wildcards
  const modifierFilters = modsList
    .map((m) => {
      const modif = m(capture)
      capture = modif.unmodifiedCapture
      return modif.filter
    })
    .filter((m) => m) as DictEntriesFilter[]

  const commandGroups = getCommandStringSearch(
    capture.match(/^<(?<id>[^:]+:[^:]+)(:(?<meta>\d+))?>$/)
      ?.groups as unknown as CommandStrGroups | undefined
  )

  const unfilteredSearchResult: DictEntry[] =
    commandGroups ?? getTrieSearch(capture, trieSearch)

  const filteredSearchResult = filterByOption(unfilteredSearchResult, option)

  const searchResult =
    unfilteredSearchResult.length === filteredSearchResult.length
      ? unfilteredSearchResult
      : filteredSearchResult

  // Simple Match
  let result = handleSingleMatch(searchResult)
  if (result) return result

  function handleSingleMatch(
    result: DictEntry[]
  ): DictEntry | DictEntry[] | undefined {
    // Only one match
    if (result.length === 1) {
      return result[0]
    }

    // We have modifiers - return them first
    if (result.length > 1) {
      for (const mFilter of modifierFilters) {
        // eslint-disable-next-line no-param-reassign
        result = mFilter(result)
        if (result) return result
      }
    }

    // Many matches, but only one is exact
    const exacts = result.filter(
      (r) => r.name.toLowerCase() === capture.toLowerCase()
    )
    if (exacts.length === 1) {
      return exacts[0]
    }
    // Exact one item from Minecraft - this probably what user want
    const fromMC = exacts.filter((r) => r.source === 'minecraft')
    if (fromMC.length === 1) {
      return fromMC[0]
    }

    // We have Tank with same name. This is fluid
    const fluidTank = result.filter(
      (r) => r.name.toLowerCase() === capture.toLowerCase() + ' tank'
    )
    if (fluidTank.length === 1) {
      return fluidTank[0]
      // TODO: Fix fluid tank custom name
      // (de) => de.name.replace(/ Tank$/, '')
    }

    // Many matches, but they all same item with different NBT
    if (
      _(result)
        .map((d) => _(d).pick(['name', 'id', 'meta']))
        .uniqWith(_.isEqual)
        .value().length === 1
    ) {
      return result[0]
    }
    return undefined
  }

  // MANY Matches
  if (searchResult.length > 1) {
    let reducedSearchResult = searchResult
    const reduceMagic = (a: DictEntry[]) =>
      a.length > 1 ? (reducedSearchResult = a) : a
    if (option) {
      // Option with Abbreviatures
      const abbrSearch = new TrieSearch<DictEntry>(['modAbbr'], {
        splitOnRegEx: undefined,
        idFieldOrFunction: 'uniq_id',
      })
      abbrSearch.addAll(searchResult)
      result = handleSingleMatch(reduceMagic(getTrieSearch(option, abbrSearch)))
      if (result) return result

      // Option lookup
      const subSearch = new TrieSearch<DictEntry>(
        ['modid', 'modname', 'meta' /* , 'nbt' */],
        { splitOnRegEx: undefined, idFieldOrFunction: 'uniq_id' }
      )
      subSearch.addAll(searchResult)
      result = handleSingleMatch(reduceMagic(getTrieSearch(option, subSearch)))
      if (result) return result
    }

    return await unclear.resolve(rawCapture, reducedSearchResult, match)
  }

  // No matches, try do_you_mean
  if (!searchResult.length) {
    const levResult = await levinshteinResolver(capture)
    return Array.isArray(levResult)
      ? await unclear.doYouMean(rawCapture, levResult, match)
      : levResult
  }

  unclear.cantBeFound(rawCapture)
  return undefined
}
