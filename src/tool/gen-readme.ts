/**
 * Regenerate the README "Examples" table from the same `@example` rows the
 * tests run against ({@link extractExamples}). The rendered result cells use
 * direct, deterministic CDN links (no is.gd round-trip), so the table is
 * reproducible from source alone.
 *
 * Run with `pnpm gen:readme`. Pass `--check` to fail (non-zero exit) when the
 * README is stale instead of rewriting it — handy for CI.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { PROJECT_ROOT } from '../lib/projectRoot'
import { extractExamples, IconizeRunner } from './examples'

const README = resolve(PROJECT_ROOT, 'README.md')
const START = '<!-- AUTOGEN:examples -->'
const END = '<!-- /AUTOGEN:examples -->'

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|')
}

async function buildTable(): Promise<string> {
  const runner = new IconizeRunner()
  const rows: string[] = [
    '| Description | Capture | Result |',
    '|-------------|---------|--------|',
  ]

  for (const ex of extractExamples()) {
    const captures: string[] = []
    const icons: string[] = []
    for (const seg of ex.segments) {
      captures.push(`\`${seg.capture}\``)
      for (const { path, name } of await runner.run(seg.capture)) {
        const alt = name.replace(/[[\]]/g, '')
        const title = name.replace(/"/g, '\\"')
        icons.push(`![${alt}](${runner.repo}${path}.png "${title}")`)
      }
    }
    rows.push(
      `| ${escapeCell(ex.description)} | ${escapeCell(captures.join('<br/>'))} | ${icons.join('') || '—'} |`,
    )
  }
  return rows.join('\n')
}

async function main() {
  const table = await buildTable()
  const md = readFileSync(README, 'utf8')

  const startIdx = md.indexOf(START)
  const endIdx = md.indexOf(END)
  if (startIdx < 0 || endIdx < 0) {
    console.error(`README markers ${START} … ${END} not found`)
    process.exit(1)
  }

  const next = `${md.slice(0, startIdx + START.length)}\n\n${table}\n\n${md.slice(endIdx)}`

  if (process.argv.includes('--check')) {
    if (next !== md) {
      console.error('README examples are stale — run `pnpm gen:readme`')
      process.exit(1)
    }
    console.log('README examples up to date')
    return
  }

  if (next !== md) {
    writeFileSync(README, next)
    console.log('README examples regenerated')
  }
  else {
    console.log('README examples already up to date')
  }
}

main()
