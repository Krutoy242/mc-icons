import type { ItemIcon } from 'mc-iexporter-iterator'
import type { ImageBase } from './images'

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import chalk from 'chalk'
import { defineCommand, runMain } from 'citty'
import fast_glob from 'fast-glob'
import iconIterator from 'mc-iexporter-iterator'

import getNameMap, { iTypePrefix } from 'mc-jeiexporter/build/NameMap'
import { PROJECT_ROOT } from '../lib/projectRoot'
import { asset, saveAssets } from './assets'
import { appendImage, grabImages, initOld } from './images'
import { parseJEIEFiles } from './jeie'
import { category } from './log'
import { appendNames } from './names'
import { addNbt } from './nbt'
import { generatePlaceholders, registerPlaceholders } from './placeholder'

interface PreparseArgs {
  mc: string
  modpack: string
  icons?: string
  overwrite: boolean
}

const main = defineCommand({
  meta: {
    name: 'preparse',
    description: 'Grab icons from a Minecraft instance and build the asset database.',
  },
  args: {
    mc: {
      type: 'string',
      alias: 'm',
      description: 'Path to minecraft folder',
      required: true,
    },
    modpack: {
      type: 'string',
      alias: 'p',
      description: 'Modpack short ID',
      required: true,
    },
    icons: {
      type: 'string',
      alias: 'i',
      description: 'Path to folder with icons from E2E-E-icons tool',
    },
    overwrite: {
      type: 'boolean',
      alias: 'o',
      description: 'Should overwrite .png files?',
      default: true,
    },
  },
  run: ({ args }) => init(args as unknown as PreparseArgs),
})

runMain(main)

// mc-jeiexporter hard-throws on any JEIE ingredient type missing from its
// `iTypePrefix` table. Mod class paths drift between versions (e.g. Requious'
// Energy gained a `com.bordlistian.` prefix), so remap unknown types onto a
// known one by suffix match, dropping anything truly unrecognized.
function sanitizeNameMap(jsonTxt: string, log: (msg: string) => void): string {
  const json: Record<string, Record<string, unknown>> = JSON.parse(jsonTxt)
  const known = Object.keys(iTypePrefix)
  const out: Record<string, Record<string, unknown>> = {}
  for (const [itype, vis] of Object.entries(json)) {
    if (itype in iTypePrefix) {
      out[itype] = { ...out[itype], ...vis }
      continue
    }
    const match = known.find(k => k && itype.endsWith(k))
    if (match) {
      log(`Remapping JEIE iType ${itype} -> ${match}`)
      out[match] = { ...out[match], ...vis }
    }
    else {
      log(`Skipping unknown JEIE iType: ${itype}`)
    }
  }
  return JSON.stringify(out)
}

async function init(argv: PreparseArgs) {
  let log = category('Preparation')

  if (argv.overwrite) {
    log('Generating placeholders...')
    await generatePlaceholders()
  }
  else {
    const label = 'Skipping overwriting, init present icons...'
    log(label)
    await registerPlaceholders()
    await initOld((current, total, skipped) => log(
      `${label}\n${chalk.green(current)} / ${chalk.hex('#007700')(total)} ${chalk.gray('skipped:')} ${chalk.hex('#888888')(skipped)}`,
    ))
  }

  log = category('JEIExporter')
  log('Open JEIExporter nameMap.json...')
  const nameMap = getNameMap(
    sanitizeNameMap(readFileSync(join(argv.mc, '/exports/nameMap.json'), 'utf8'), log),
  )

  log('Generating nbt hash map...')
  Object.entries(nameMap).forEach(([id, nameData]) => {
    if (id === 'info')
      return
    const [_source, _name, _meta, nbtHash] = id.split(':')
    const sNbt: string = (nameData as any)?.tag
    addNbt(nbtHash, sNbt)
  })

  log('Grabbing icons from places...')

  // Manually Predefined images
  fast_glob.sync('*.png', { cwd: resolve(PROJECT_ROOT, 'i/placeholder') }).forEach((file) => {
    appendImage(join('i/placeholder', file))
  })

  let skipped = 0
  let copied = 0
  let processed = 0

  function logFileAdd(isAdded: boolean, wholeLength: number, base: ImageBase) {
    processed++
    copied += Number(isAdded)
    skipped += Number(!isAdded)
    if (processed % 100 !== 0)
      return
    const files = chalk.hex('#0e7182')(`${processed} / ${wholeLength}`)
    const s_copied = `copied: ${copied}`
    const s_skipped = `skipped: ${skipped}`
    const current = `current: ${chalk.hex('#0e8257')(base.source)}`
    log(`Files: ${files}, ${s_copied}, ${s_skipped}, ${current}`)
  }

  await parseJEIEFiles([
    ['thaumcraft.api.aspects.AspectList', 'aspect'],
    ['lach_01298.qmd.particle.ParticleStack', 'particle', /^particle__/],
    ['mekanism.api.gas.GasStack', 'gas', /^gas__/],
    ['fluid', 'fluid'],
    ['item'],
  ], argv.mc, logFileAdd)

  if (argv.icons) {
    log = category('Icon Exporter')
    log('Getting array...')
    processed = 0
    const iconExporter: ItemIcon[] = []
    // const maxIter = 1000
    // @ts-expect-error module
    for (const o of ((iconIterator.default ?? iconIterator) as typeof iconIterator)(
      join(argv.mc, argv.icons),
    )) {
      iconExporter.push(o)
      if (o.sNbt && o.sNbt !== '{}')
        addNbt(o.hash, o.sNbt)
      // if (--maxIter <= 0) break
    }
    await grabImages(
      iconExporter,
      icon => ({
        ...icon,
        source: icon.namespace,
        entry: icon.name,
        fileName: `${icon.fileName}.png`,
      }),
      logFileAdd,
    )
  }

  log = category('Export')
  log('Generating item names ...')
  appendNames(nameMap)

  log('Generating mod names ...')
  const modlist = join(argv.mc, 'config/crash_assistant/modlist.json')
  if (existsSync(modlist)) {
    const modlistData: Record<string, { modId: string; name: string }> = JSON.parse(
      readFileSync(modlist, 'utf8'),
    )
    const modNames: Record<string, string> = {}
    for (const entry of Object.values(modlistData)) {
      if (entry.modId && entry.name)
        modNames[entry.modId] = entry.name
    }

    for (const [id, name] of Object.entries(modNames)) {
      asset.mods[id] = name
    }

    log('Generating modpacks data')
    asset.modpacks[argv.modpack] = Object.keys(modNames)
      .filter(k => asset.items[k] && Object.keys(asset.items[k]).length)
      .sort()
  }
  else {
    log(`Skipping mod names & modpacks: ${modlist} not found`)
  }

  log('Saving assets ...')
  await saveAssets()
}
