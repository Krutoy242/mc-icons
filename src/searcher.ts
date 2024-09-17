import type { CliOpts } from './cli'
import type { RgxExecIconMatch } from './iconizeMatch'
import type { Base } from './tool/types'
import { TrieSearch } from '@committed/trie-search'

import chalk from 'chalk'
import levenshtein from 'fast-levenshtein'
import _ from 'lodash'
import { AssetEx } from './assetEx'
import { getIcon } from './getIcon'
import { capture_rgx, iconizeMatch } from './iconizeMatch'
import isgd from './lib/isgd'
import { getTrieSearch } from './trie'
import { Unclear } from './unclear'

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
  modname: string
  modAbbr: string
  source: string
  entry: string
  meta: string
  sNbt: string | undefined
}

const trieSearch = new TrieSearch<DictEntry>(
  ['name'],
  {
    /* splitOnRegEx:false,  */ idFieldOrFunction: 'id',
  },
)

function getGlobalTrieSearch(assetEx: AssetEx) {
  return (s: string) => {
    if (!trieSearch.size)
      initTrie(assetEx)
    return getTrieSearch(s, trieSearch)
  }
}

function initTrie(assetEx: AssetEx) {
  write(` Map Trie [${assetEx.nameDictionary.length}]...`)
  trieSearch.addAll(assetEx.nameDictionary)
  write(' done.\n')
}

function getByID(assetEx: AssetEx, id: string): DictEntry[] | undefined {
  const result = assetEx.getById(id)
  return result ? [result] : undefined
}

function getByCommandString(
  assetEx: AssetEx,
  capture: string,
): DictEntry[] | undefined {
  const id = capture.match(/^<(.+)>$/)?.[1]
  return id ? getByID(assetEx, id) : undefined
}

type LevDict = [number, DictEntry]

function levinshteinResolver(
  assetEx: AssetEx,
  treshold: number,
  capture: string,
) {
  const capture_low = capture.toLowerCase()
  const lev = assetEx.nameDictionary.map(
    o => [levenshtein.get(o.name_low, capture_low), o] as LevDict,
  )
  const levDict = _.sortBy(lev, 0)
  const t1 = levDict[0][0]
  const t2 = levDict[1][0]
  const isTresholdPass = t1 < t2 && t1 <= treshold
  return isTresholdPass ? [levDict[0][1]] : levDict.map(o => o[1])
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
  replaceCB: (replaced: string) => void,
): Promise<void> {
  const replaces: { from: string, to: { base: Base, name: string }[] }[] = []
  const unclear = new Unclear(argv)
  const assetEx = new AssetEx(argv)
  const trieSearchFn = getGlobalTrieSearch(assetEx)

  write('Looking for Item names ')

  for (const match of md.matchAll(capture_rgx)) {
    write()
    const dicts = await iconizeMatch(
      match as RgxExecIconMatch,
      trieSearchFn,
      unclear,
      s => levinshteinResolver(assetEx, argv.treshold || 0, s),
      s => getByCommandString(assetEx, s),
      s => getByID(assetEx, s),
    )

    if (!dicts?.length)
      continue

    replaces.push({
      to: dicts.map(de => ({
        name: de.name,
        base: [de.source, de.entry, de.meta, de.sNbt] as Base,
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
  }
  else {
    console.log('No replacables found.')
    process.exit(0)
  }

  // ##################################################################
  //
  // Replace words with links
  //
  // ##################################################################

  write('Replacing ')

  let tmpMd = md
  // Get all promises
  const actualReplaces: typeof replaces = []
  const shortURL_promises: Promise<string>[] = []
  for (const repl of replaces) {
    tmpMd = tmpMd.replace(repl.from, (match) => {
      const serialized = repl.to
        .map(({ base }) => getIcon(base))
        .filter((r): r is string => !!r)
      if (serialized.length > 0) {
        actualReplaces.push(repl)

        for (const ser of serialized) {
          const full = `${argv.repo}${ser}.png`
          const p = argv.short ? isgd(full) : Promise.resolve(full)
          p.then(() => write())
          shortURL_promises.push(p)
        }
        return ''
      }
      return match
    })
  }

  tmpMd = md
  Promise.all(shortURL_promises).then((shortURLs) => {
    let k = 0
    actualReplaces.forEach((repl) => {
      tmpMd = tmpMd.replace(repl.from, (...args) =>
        repl.to
          .map(
            item =>
              `${args.pop()?.prefix ?? ''}![](${
                shortURLs[k++]
              } "${item.name.replace(/"/g, '\\"')}")`,
          )
          .join(''))
    })

    replaceCB(tmpMd)
    console.log(' done')
    process.exit(0)
  })
}
