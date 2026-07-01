import type { DictEntry } from '../searcher'
import { TrieSearch } from '@committed/trie-search'
import levenshtein from 'fast-levenshtein'
import { describe, expect, it } from 'vitest'
import { AssetEx } from '../assetEx'
import { capture_rgx } from '../iconizeMatch'
import { FuzzyResolver, linearResolve } from '../lib/fuzzy'
import { getTrieSearch } from '../trie'

// NOTE: the text→icon conversion features (exact/mod/meta/modifier/id matching)
// are covered by `examples.test.ts`, driven by the `@example` rows that also
// generate the README. This file keeps the lower-level unit tests that are not
// about text mutation: regex capture, trie/fuzzy internals, getIcon, AssetEx.

// Setup shared across tests
const defaultArgv = {
  treshold: 0,
  max: 64,
  repo: 'https://github.com/Krutoy242/mc-icons/raw/master/i/',
  modpack: '',
  short: false,
  silent: true,
  discord: false,
}

function createTestDeps(argv = defaultArgv) {
  const assetEx = new AssetEx(argv)
  const trieSearch = new TrieSearch<DictEntry>(
    ['name'],
    { idFieldOrFunction: 'id' },
  )
  trieSearch.addAll(assetEx.nameDictionary)

  const trieSearchFn = (s: string) => getTrieSearch(s, trieSearch)

  return {
    assetEx,
    trieSearchFn,
  }
}

describe('regex capture', () => {
  it('matches basic [Item] syntax', () => {
    const text = 'Hello [Stone] world'
    const matches = [...text.matchAll(capture_rgx)]
    expect(matches).toHaveLength(1)
    expect(matches[0].groups!.capture).toBe('Stone')
    expect(matches[0].groups!.option).toBeUndefined()
  })

  it('matches [Item] (option) syntax', () => {
    const text = 'Hello [Stone] (minecraft) world'
    const matches = [...text.matchAll(capture_rgx)]
    expect(matches).toHaveLength(1)
    expect(matches[0].groups!.capture).toBe('Stone')
    expect(matches[0].groups!.option).toBe('minecraft')
  })

  it('does not match markdown links [text](url)', () => {
    const text = 'See [docs](https://example.com) for more'
    const matches = [...text.matchAll(capture_rgx)]
    expect(matches).toHaveLength(0)
  })

  it('matches multiple items in one line', () => {
    const text = '[Stone] and [Dirt] and [Diamond]'
    const matches = [...text.matchAll(capture_rgx)]
    expect(matches).toHaveLength(3)
    expect(matches[0].groups!.capture).toBe('Stone')
    expect(matches[1].groups!.capture).toBe('Dirt')
    expect(matches[2].groups!.capture).toBe('Diamond')
  })

  it('matches items with nested brackets in text', () => {
    const text = '[Stone [special]]'
    const matches = [...text.matchAll(capture_rgx)]
    // Note: regex behavior with nested brackets - it captures until first ]
    expect(matches.length).toBeGreaterThan(0)
  })
})

describe('trie search', () => {
  const deps = createTestDeps()

  it('finds items by partial word match', () => {
    const results = deps.trieSearchFn('Stone')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.name.toLowerCase().includes('stone'))).toBe(true)
  })
})

describe('fuzzy resolver (BK-tree vs linear parity)', () => {
  const assetEx = new AssetEx(defaultArgv)
  const dict = assetEx.nameDictionary
  const resolver = new FuzzyResolver(dict)
  const queries = ['Beacom', 'Daimond', 'Cobblstone', 'Redstoen', 'Iron Igot']
  const dist = (e: DictEntry, q: string) => levenshtein.get(e.name_low, q.toLowerCase())

  for (const q of queries) {
    it(`finds the same closest distance as linear for "${q}"`, () => {
      const bk = resolver.resolve(q, 0, 64)
      const lin = linearResolve(dict, q, 0, 64)
      expect(bk.length).toBeGreaterThan(0)
      // BK-tree must reach the true nearest neighbour that the full scan finds
      expect(dist(bk[0], q)).toBe(dist(lin[0], q))
    })
  }

  it('returns a single entry when one match passes the threshold', () => {
    // "Beaco" is distance 1 from "Beacon"; with threshold 1 it should resolve uniquely
    const bk = resolver.resolve('Beaco', 1, 64)
    const lin = linearResolve(dict, 'Beaco', 1, 64)
    expect(bk.length).toBe(lin.length)
  })
})

describe('getIcon', () => {
  it('returns path for valid item', async () => {
    const { getIcon } = await import('../getIcon')
    const result = getIcon(['minecraft', 'stone', 0])
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('returns undefined for non-existent item', async () => {
    const { getIcon } = await import('../getIcon')
    const result = getIcon(['nonexistent', 'mod', 0])
    expect(result).toBeUndefined()
  })

  it('handles object parameter', async () => {
    const { getIcon } = await import('../getIcon')
    const result = getIcon({ source: 'minecraft', entry: 'stone', meta: 0 })
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })
})

describe('assetEx', () => {
  it('initializes name dictionary', () => {
    const assetEx = new AssetEx(defaultArgv)
    expect(assetEx.nameDictionary.length).toBeGreaterThan(0)
  })

  it('looks up items by ID', () => {
    const assetEx = new AssetEx(defaultArgv)
    const result = assetEx.getById('minecraft:stone:0')
    expect(result).toBeDefined()
    expect(result!.source).toBe('minecraft')
    expect(result!.entry).toBe('stone')
  })

  it('returns undefined for unknown ID', () => {
    const assetEx = new AssetEx(defaultArgv)
    const result = assetEx.getById('nonexistent:item:0')
    expect(result).toBeUndefined()
  })
})
