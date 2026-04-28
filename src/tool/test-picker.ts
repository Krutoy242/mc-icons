import type { PickerOption } from '../picker'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pick } from '../picker'
import { asset } from './assets'

const ROOT = path.resolve('i')
const SUBDIR_COUNT = 10
const ICONS_PER_DIR = 3

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = arr.slice()
  const out: T[] = []
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

function parseFilename(file: string): { entry: string, meta: string, hash?: string } {
  const base = file.replace(/\.png$/i, '')
  const parts = base.split('__')
  const entry = parts[0] ?? base
  const meta = parts[1] ?? '0'
  const hash = parts[2]
  return { entry, meta, hash }
}

function buildOption(source: string, file: string): PickerOption {
  const { entry, meta, hash } = parseFilename(file)
  const modname = asset.mods[source] || source
  const niceName = entry
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return {
    name: niceName,
    modname,
    caption: `${source}:${entry}:${meta}`,
    footnote: hash ? `nbt#${hash}` : undefined,
    imagePath: path.join(ROOT, source, file),
  }
}

const allDirs = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)

const sources = pickRandom(allDirs, SUBDIR_COUNT)
const fixtures: PickerOption[] = []
for (const source of sources) {
  const dir = path.join(ROOT, source)
  const files = fs
    .readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.png'))
  const chosen = pickRandom(files, ICONS_PER_DIR)
  for (const file of chosen) fixtures.push(buildOption(source, file))
}

;(async () => {
  if (!fixtures.length) {
    console.error(`no PNGs found under ${ROOT}`)
    process.exit(1)
  }
  const idx = await pick({
    prompt: `Select Any variant (${fixtures.length} options from ${sources.join(', ')}):`,
    options: fixtures,
  })
  if (idx === undefined) {
    console.log('cancelled')
    process.exit(0)
  }
  const sel = fixtures[idx]
  console.log(`selected: [${idx}] ${sel.name} ${sel.caption ?? ''}`)
  process.exit(0)
})()
