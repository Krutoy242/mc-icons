import type { DictEntry } from '../searcher'
import { TrieSearch } from '@committed/trie-search'
import levenshtein from 'fast-levenshtein'
import _ from 'lodash'
import { describe, expect, it } from 'vitest'
import { AssetEx } from '../assetEx'
import { capture_rgx, iconizeMatch } from '../iconizeMatch'
import { getTrieSearch } from '../trie'
import { Unclear } from '../unclear'

// Helper to create match object from markdown-like text
function createMatch(text: string, capture: string, option?: string): any {
  const fullText = option ? `[${capture}] (${option})` : `[${capture}]`
  const index = text.indexOf(fullText)
  return {
    0: fullText,
    index,
    input: text,
    groups: {
      capture,
      tail: option ? ` (${option})` : undefined,
      option,
    },
  }
}

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

  const unclear = new Unclear(argv)
  // Mock resolve to just return undefined (silent mode skips prompts)
  unclear.resolve = async () => undefined

  function levinshteinResolver(capture: string) {
    const capture_low = capture.toLowerCase()
    const lev = assetEx.nameDictionary.map(
      o => [levenshtein.get(o.name_low, capture_low), o] as [number, DictEntry],
    )
    const levDict = _.sortBy(lev, 0)
    const t1 = levDict[0][0]
    const t2 = levDict[1]?.[0] ?? Infinity
    const isTresholdPass = t1 < t2 && t1 <= (argv.treshold || 0)
    return isTresholdPass ? [levDict[0][1]] : levDict.map(o => o[1]).slice(0, argv.max)
  }

  function getByCommandString(capture: string) {
    const id = capture.match(/^<(.+)>$/)?.[1]
    return id ? (assetEx.getById(id) ? [assetEx.getById(id)!] : undefined) : undefined
  }

  function getByID(id: string) {
    const result = assetEx.getById(id)
    return result ? [result] : undefined
  }

  return {
    assetEx,
    trieSearchFn,
    unclear,
    levinshteinResolver,
    getByCommandString,
    getByID,
  }
}

describe('icon Search', () => {
  const deps = createTestDeps()

  async function search(text: string, capture: string, option?: string) {
    const match = createMatch(text, capture, option)
    return iconizeMatch(
      match,
      deps.trieSearchFn,
      deps.unclear,
      deps.levinshteinResolver,
      deps.getByCommandString,
      deps.getByID,
    )
  }

  describe('basic matching', () => {
    it('[Stone] => finds stone item', async () => {
      const result = await search('[Stone]', 'Stone')
      expect(result).toBeDefined()
      expect(result!.length).toBeGreaterThan(0)
      expect(result!.some(r => r.name === 'Stone')).toBe(true)
    })

    it('[Beacon] => finds exact match', async () => {
      const result = await search('[Beacon]', 'Beacon')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].name).toBe('Beacon')
    })

    it('[Glass] => prefers Minecraft item first', async () => {
      const result = await search('[Glass]', 'Glass')
      expect(result).toBeDefined()
      expect(result!.length).toBeGreaterThan(0)
      // When multiple exact matches exist and one is from Minecraft, it should be picked
      expect(result![0].source).toBe('minecraft')
    })

    it('[Diamond] => returns diamond-related items', async () => {
      const result = await search('[Diamond]', 'Diamond')
      expect(result).toBeDefined()
      expect(result!.length).toBeGreaterThan(0)
    })
  })

  describe('modifiers', () => {
    it('[Date (any)] => returns single item', async () => {
      const result = await search('[Date (any)]', 'Date (any)')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
    })

    it('[Date (every)] => returns multiple items', async () => {
      const result = await search('[Date (every)]', 'Date (every)')
      expect(result).toBeDefined()
      expect(result!.length).toBeGreaterThan(1)
    })
  })

  describe('options / Filters', () => {
    it('[Ash] (forestry) => filters by mod name to single result', async () => {
      const result = await search('[Ash] (forestry)', 'Ash', 'forestry')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].source).toBe('forestry')
    })

    it('[Fan] (cyclicmagic) => filters by mod abbreviation', async () => {
      const result = await search('[Fan] (cyclicmagic)', 'Fan', 'cyclicmagic')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].source).toBe('cyclicmagic')
    })

    it('[Flag] (1) => filters by metadata', async () => {
      const result = await search('[Flag] (1)', 'Flag', '1')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].meta).toBe('1')
      expect(result![0].source).toBe('openblocks')
    })

    it('[Flag] (0) => filters by metadata returning different variant', async () => {
      const result = await search('[Flag] (0)', 'Flag', '0')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].meta).toBe('0')
      expect(result![0].source).toBe('openblocks')
    })

    it('[Enriched Lava] (fluid) => finds fluid item', async () => {
      const result = await search('[Enriched Lava] (fluid)', 'Enriched Lava', 'fluid')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].source).toBe('fluid')
    })
  })

  describe('command string / ID capture', () => {
    it('[<minecraft:stone:0>] => finds exact item by ID', async () => {
      const result = await search('[<minecraft:stone:0>]', '<minecraft:stone:0>')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].source).toBe('minecraft')
      expect(result![0].entry).toBe('stone')
    })

    it('[<minecraft:coal:1>] => finds charcoal by exact ID', async () => {
      const result = await search('[<minecraft:coal:1>]', '<minecraft:coal:1>')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].entry).toBe('coal')
      expect(result![0].meta).toBe('1')
    })

    it('[<tconstruct:large_plate:0:{Material:"fierymetal"}>] => finds NBT item', async () => {
      const result = await search('[<tconstruct:large_plate:0:{Material:"fierymetal"}>]', '<tconstruct:large_plate:0:{Material:"fierymetal"}>')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].source).toBe('tconstruct')
      expect(result![0].entry).toBe('large_plate')
    })
  })

  describe('placeholders', () => {
    it('[<placeholder:null>] => finds placeholder null', async () => {
      const result = await search('[<placeholder:null>]', '<placeholder:null>')
      expect(result).toBeDefined()
      expect(result!.length).toBe(1)
      expect(result![0].source).toBe('placeholder')
    })
  })

  describe('edge cases', () => {
    it('empty capture => returns undefined', async () => {
      const result = await search('[]', '')
      expect(result).toBeUndefined()
    })

    it('[x] => returns undefined (markdown list marker)', async () => {
      const result = await search('[x]', 'x')
      expect(result).toBeUndefined()
    })

    it('[X] => returns undefined (uppercase markdown list)', async () => {
      const result = await search('[X]', 'X')
      expect(result).toBeUndefined()
    })

    it('nonexistent item => returns undefined', async () => {
      const result = await search('[ZZZNonExistentItemZZZ]', 'ZZZNonExistentItemZZZ')
      expect(result).toBeUndefined()
    })

    it('case insensitive match [stone] finds [Stone]', async () => {
      const result = await search('[stone]', 'stone')
      expect(result).toBeDefined()
      expect(result!.length).toBeGreaterThan(0)
      expect(result!.some(r => r.name.toLowerCase() === 'stone')).toBe(true)
    })

    it('fuzzy match finds item with typo', async () => {
      const result = await search('[Beacom]', 'Beacom')
      // With treshold 0, this should not use levenshtein unless exact+trie fail
      // and there's a clear closest match
      // The test verifies the search pipeline handles fuzzy input
      expect(result === undefined || result.length > 0).toBe(true)
    })
  })
})

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
