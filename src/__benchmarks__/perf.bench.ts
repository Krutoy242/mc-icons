/* eslint-disable test/prefer-lowercase-title */
import type { DictEntry } from '../searcher'
import { bench, describe } from 'vitest'
import { AssetEx } from '../assetEx'
import { FuzzyResolver, linearResolve } from '../lib/fuzzy'

// ──────────────────────────────────────────────────────────────────────────
// Setup — load the real name dictionary once (from assets.db via AssetEx)
// ──────────────────────────────────────────────────────────────────────────

const dictionary: DictEntry[] = new AssetEx({
  treshold: 0,
  max: 64,
  repo: '',
  modpack: '',
  short: false,
  silent: true,
  discord: false,
} as any).nameDictionary

const fuzzyResolver = new FuzzyResolver(dictionary)

// Typo queries that miss exact/trie matching and fall through to fuzzy
const typoQueries = ['Beacom', 'Daimond', 'Cobblstone', 'Redstoen', 'Furnaze', 'Enchnting Table']

console.log(`\n[bench dataset] dictionary=${dictionary.length}\n`)

// ──────────────────────────────────────────────────────────────────────────
// Fuzzy search — construction cost + per-batch query cost.
// BK-tree is the production path; linear O(N) scan kept as the baseline it
// replaced (~2.6x faster on this dataset).
// ──────────────────────────────────────────────────────────────────────────

describe('fuzzy: build index', () => {
  bench('linear (no build)', () => {
    // linearResolve needs no prebuilt index
  })

  bench('BK-tree construction', () => {
    void new FuzzyResolver(dictionary)
  })
})

describe('fuzzy: resolve 6 typo queries', () => {
  bench('linear O(N) scan (baseline)', () => {
    for (const q of typoQueries) linearResolve(dictionary, q, 0, 64)
  })

  bench('BK-tree (prebuilt)', () => {
    for (const q of typoQueries) fuzzyResolver.resolve(q, 0, 64)
  })
})
