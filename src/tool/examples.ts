/**
 * Single source of truth for the text→icon conversion features.
 *
 * Each feature carries a `@example` line at its implementation site using the
 * DSL below. {@link extractExamples} greps those lines out of the source; the
 * shared {@link IconizeRunner} executes an input through the real matching
 * pipeline; `examples.test.ts` asserts the outputs and `gen-readme.ts` renders
 * the README table — all from the same parsed examples.
 *
 * DSL (one line per row, inside a jsdoc comment):
 *
 * ```
 * (at)example <description> | <capture> => <path>[,<path>…] [ ; <capture> => <path>… ]
 * ```
 *
 * - `<description>` — human text for the README "Description" column.
 * - `<capture>` — the markdown snippet fed to the matcher, e.g. `[Beacon]`.
 * - after `=>` — comma-separated expected icon paths (as {@link getIcon}
 *   returns them, without repo prefix or `.png`). Use `(none)` for "no match".
 * - `;` separates several captures that belong to the same README row.
 */
import type { CliOpts } from '../cli.js'
import type { RgxExecIconMatch } from '../iconizeMatch.js'
import type { DictEntry } from '../searcher.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TrieSearch } from '@committed/trie-search'
import { AssetEx } from '../assetEx.js'
import { getIcon } from '../getIcon.js'
import { capture_rgx, iconizeMatch } from '../iconizeMatch.js'
import { FuzzyResolver } from '../lib/fuzzy.js'

import { PROJECT_ROOT } from '../lib/projectRoot.js'
import { getTrieSearch } from '../trie.js'
import { Unclear } from '../unclear.js'

// ──────────────────────────────────────────────────────────────────────────
// Example DSL parsing
// ──────────────────────────────────────────────────────────────────────────

export interface ExampleSegment {
  /** Markdown capture fed to the matcher, e.g. `[Beacon]` or `[Ash] (forestry)`. */
  capture: string
  /** Expected icon paths ({@link getIcon} output), empty for `(none)`. */
  expected: string[]
}

export interface Example {
  description: string
  segments: ExampleSegment[]
  /** Source file the example was extracted from (repo-relative). */
  file: string
}

/** Files scanned for `@example` conversion rows, in README display order. */
export const EXAMPLE_SOURCES = [
  'src/iconizeMatch.ts',
  'src/modifiers.ts',
  'src/searcher.ts',
  'src/assetEx.ts',
]

const EXAMPLE_LINE = /@example\s(.+)$/

/** Parse the raw text after `@example ` into a structured {@link Example}. */
export function parseExampleLine(raw: string, file = ''): Example | undefined {
  const barIdx = raw.indexOf(' | ')
  if (barIdx < 0)
    return undefined
  const description = raw.slice(0, barIdx).trim()
  const body = raw.slice(barIdx + 3).trim()

  const segments: ExampleSegment[] = []
  for (const part of body.split(' ; ')) {
    const arrowIdx = part.indexOf(' => ')
    if (arrowIdx < 0)
      continue
    const capture = part.slice(0, arrowIdx).trim()
    const rhs = part.slice(arrowIdx + 4).trim()
    const expected = rhs === '(none)'
      ? []
      : rhs.split(',').map(s => s.trim()).filter(Boolean)
    segments.push({ capture, expected })
  }
  if (!segments.length)
    return undefined
  return { description, segments, file }
}

/** Grep every configured source file for `@example` conversion rows. */
export function extractExamples(root = PROJECT_ROOT): Example[] {
  const out: Example[] = []
  for (const rel of EXAMPLE_SOURCES) {
    const text = readFileSync(resolve(root, rel), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(EXAMPLE_LINE)
      if (!m)
        continue
      const parsed = parseExampleLine(m[1], rel)
      if (parsed)
        out.push(parsed)
    }
  }
  return out
}

// ──────────────────────────────────────────────────────────────────────────
// Shared pipeline runner — a headless, deterministic `bracketsSearch`
// ──────────────────────────────────────────────────────────────────────────

export interface IconizeResult {
  /** Icon path from {@link getIcon}, e.g. `minecraft/beacon__0`. */
  path: string
  /** Display name of the matched item. */
  name: string
}

const RUNNER_ARGV: CliOpts = {
  treshold: 0,
  max: 64,
  repo: 'https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/',
  modpack: '',
  short: false,
  silent: true,
  discord: false,
}

/**
 * Runs captures through the exact production matcher ({@link iconizeMatch}) but
 * without any interactivity or network: `unclear.resolve` is stubbed to skip
 * ambiguous prompts and results are mapped straight to icon paths. Build once,
 * reuse across many `run` calls (dictionary/trie/fuzzy are amortized).
 */
export class IconizeRunner {
  readonly repo = RUNNER_ARGV.repo
  private assetEx: AssetEx
  private trie: TrieSearch<DictEntry>
  private fuzzy: FuzzyResolver
  private unclear: Unclear

  constructor(argv: CliOpts = RUNNER_ARGV) {
    this.assetEx = new AssetEx(argv)
    this.trie = new TrieSearch<DictEntry>(['name'], { idFieldOrFunction: 'id' })
    this.trie.addAll(this.assetEx.nameDictionary)
    this.fuzzy = new FuzzyResolver(this.assetEx.nameDictionary)
    this.unclear = new Unclear(argv)
    // Ambiguous captures would prompt an interactive picker; skip them.
    this.unclear.resolve = async () => undefined
  }

  private trieSearch = (s: string) => getTrieSearch(s, this.trie)
  private getByID = (id: string): DictEntry[] | undefined => {
    const r = this.assetEx.getById(id)
    return r ? [r] : undefined
  }

  private getByCommandString = (capture: string): DictEntry[] | undefined => {
    const id = capture.match(/^<(.+)>$/)?.[1]
    return id ? this.getByID(id) : undefined
  }

  /** Resolve every `[capture]` in `text` to its icon paths + names. */
  async run(text: string): Promise<IconizeResult[]> {
    const out: IconizeResult[] = []
    for (const match of text.matchAll(capture_rgx)) {
      const dicts = await iconizeMatch(
        match as RgxExecIconMatch,
        this.trieSearch,
        this.unclear,
        s => this.fuzzy.resolve(s, RUNNER_ARGV.treshold || 0, RUNNER_ARGV.max),
        this.getByCommandString,
        this.getByID,
      )
      if (!dicts?.length)
        continue
      for (const de of dicts) {
        const path = getIcon([de.source, de.entry, de.meta, de.sNbt])
        if (path)
          out.push({ path, name: de.name })
      }
    }
    return out
  }

  /** Icon paths only — the shape `@example` expected values compare against. */
  async paths(text: string): Promise<string[]> {
    return (await this.run(text)).map(r => r.path)
  }
}
