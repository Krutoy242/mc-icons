import { TrieSearch } from '@committed/trie-search'
import chalk from 'chalk'
import levenshtein from 'fast-levenshtein'
import _ from 'lodash'

import { Base, Tree } from './Tree'
import { capture_rgx, iconizeMatch, RgxExecIconMatch } from './iconizeMatch'
import isgd from './lib/isgd'
import parsed_items_json from './parsed_items.json'
import parsed_names_json from './parsed_names.json'
import { Unclear } from './unclear'

import { CliOpts } from '.'

const parsed_names = parsed_names_json as [
  name: string,
  id: `${string}${'' | `':'+${string}`}`,
  n_meta?: number,
  nbt?: string
][]
const parsed_items = parsed_items_json as Tree

const write = (s = '.') => process.stdout.write(s)

// ##################################################################
//
// Preparations
//
// ##################################################################

export interface DictEntry {
  name: string
  name_low: string
  id: string
  modid: string
  modname: string
  modAbbr: string
  meta: number
  nbt: string | undefined
  uniq_id: number
}

const trieSearch = new TrieSearch<DictEntry>(
  ['name', 'id', 'modid', 'modname', 'meta' /* , 'nbt' */],
  {
    /* splitOnRegEx:false,  */ idFieldOrFunction: 'uniq_id',
  }
)
const nameDictionary: DictEntry[] = []
const nameAliases: Record<string, string> = {}
const lookupTree: {
  [modid: string]: {
    [definition: string]: {
      [meta: string]: DictEntry
    }
  }
} = {}

function initTrie() {
  if (trieSearch.size) return
  write(' Init dictionary...')
  parsed_names.forEach(([name, id, n_meta, nbt], i) => {
    const [modid, definition] = id.split(':')
    if (!name || !id) return
    if (!definition) {
      nameAliases[modid] = name
      return
    }
    const meta = n_meta ?? 0
    const modname = nameAliases[modid]

    const newEntry: DictEntry = {
      name,
      id,
      meta,
      nbt,
      modid,
      modname,
      name_low: name.toLowerCase(),
      modAbbr: abbr1(modname),
      uniq_id: i,
    }
    nameDictionary.push(newEntry)

    const oldEntry = ((lookupTree[modid] ??= {})[definition] ??= {})[meta]
    if (!oldEntry || oldEntry.nbt)
      lookupTree[modid][definition][meta] = newEntry
  })
  write(' Map Trie...')
  trieSearch.addAll(nameDictionary)
  write(' done.\n')
}

function abbr1(str: string) {
  return str
    .replace(/[^\w ]/, '') // Remove special chars
    .split(' ')
    .map((s) => s[0])
    .join('') // First letter of each word
}

export interface CommandStrGroups {
  id: `${string}:${string}`
  meta?: `${number}`
}

function getCommandStringSearch(
  groups?: CommandStrGroups
): DictEntry[] | undefined {
  if (!groups) return
  const [modid, definition] = groups.id.split(':')
  const meta = Number(groups.meta) || 0
  const result = lookupTree[modid]?.[definition]?.[meta]
  return result ? [result] : undefined
}

export type LevDict = [number, DictEntry]
function doYouMean(capture: string): LevDict[] {
  const capture_low = capture.toLowerCase()
  const lev = nameDictionary.map(
    (o) => [levenshtein.get(o.name_low, capture_low), o] as LevDict
  )
  return _.sortBy(lev, 0)
}

function createLevinshteinResolver(treshold: number) {
  return async (capture: string) => {
    const levDict = doYouMean(capture)
    const t1 = levDict[0][0]
    const t2 = levDict[1][0]
    const isTresholdPass = t1 < t2 && t1 <= treshold
    return isTresholdPass ? levDict[0][1] : levDict.map((o) => o[1])
  }
}

// ##################################################################
//
// Find words
//
// ##################################################################

// #########################
// Brackeds method
// #########################
export async function bracketsSearch(
  argv: CliOpts,
  md: string,
  callback: (replaced: string) => void
): Promise<void> {
  const replaces: { from: string; to: { base: Base; name: string }[] }[] = []
  const unclear = new Unclear(argv)

  write('Looking for Item names ')

  for (const match of md.matchAll(capture_rgx)) {
    initTrie()
    write()
    const result = await iconizeMatch(
      match as RgxExecIconMatch,
      trieSearch,
      unclear,
      createLevinshteinResolver(Number(argv.treshold) || 0),
      getCommandStringSearch
    )

    if (!result) continue
    const dicts = (Array.isArray(result) ? result : [result]).filter(Boolean)
    if (!dicts.length) continue

    replaces.push({
      to: dicts.map((de) => ({
        name: de.name,
        base: [...de.id.split(':'), de.meta, de.nbt] as unknown as Base,
      })),
      from: match[0],
    })
  }

  // #########################
  // Handlers
  // #########################

  // Sort to parsing longest first
  replaces.sort((a, b) => b.from.length - a.from.length)

  console.log(' done')

  unclear.print()

  if (replaces.length) {
    console.log('found names: ', chalk`{bold.yellow ${replaces.length}}`)
  } else {
    console.log('No replacables found.')
    process.exit(0)
  }

  // ##################################################################
  //
  // Replace words with links
  //
  // ##################################################################

  function getSerialized(base: Base): string | undefined {
    const [bOwner, bName, bMeta, bNBT] = base
    const definition = parsed_items[bOwner]?.[bName]
    if (!definition) return undefined
    const s = `${bOwner}__${bName}`

    const stack = definition[bMeta]
    if (stack === undefined) return `${s}__0`

    for (const [key_hash, sNBT] of Object.entries(stack)) {
      if (sNBT !== '' && sNBT === bNBT) return `${s}__${bMeta}__${key_hash}`
    }

    return `${s}__${bMeta}`
  }

  write('Replacing ')

  let tmpMd = md
  // Get all promises
  const actualReplaces: typeof replaces = []
  const shortURL_promises: Promise<string>[] = []
  for (const repl of replaces) {
    tmpMd = tmpMd.replace(repl.from, (match) => {
      const serialized = repl.to
        .map((r) => getSerialized(r.base))
        .filter((r) => r)
      if (serialized.length > 0) {
        actualReplaces.push(repl)

        for (const ser of serialized) {
          const p = isgd(`${argv.repo}${ser}.png`)
          p.then(() => write())
          shortURL_promises.push(p)
        }
        return ''
      }
      return match
    })
  }

  Promise.all(shortURL_promises).then((shortURLs) => {
    let k = 0
    actualReplaces.forEach((repl) => {
      // eslint-disable-next-line no-param-reassign
      md = md.replace(repl.from, (...args) =>
        repl.to
          .map(
            (item) =>
              `${args.pop()?.prefix ?? ''}![](${shortURLs[k++]} "${item.name}")`
          )
          .join('')
      )
    })

    callback(md)
    console.log(' done')
    process.exit(0)
  })
}
