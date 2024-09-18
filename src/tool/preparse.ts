import type { ItemIcon } from 'mc-iexporter-iterator'
import type { ImageBase } from './images'

import { join } from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import fast_glob from 'fast-glob'
import fse from 'fs-extra'
import iconIterator from 'mc-iexporter-iterator'

import getNameMap from 'mc-jeiexporter/build/NameMap'
import yargs from 'yargs'
import { asset, saveAssets } from './assets'
import { appendImage, grabImages, initOld } from './images'
import { parseJEIEFiles } from './jeie'
import { category } from './log'
import { appendNames } from './names'
import { addNbt } from './nbt'
import { generatePlaceholders } from './placeholder'

const { readFileSync } = fse

const argv = yargs(process.argv.slice(2))
  .alias('h', 'help')
  .option('mc', {
    alias: 'm',
    type: 'string',
    describe: 'Path to minecraft folder',
    demandOption: true,
  })
  .option('modpack', {
    alias: 'p',
    type: 'string',
    describe: 'Modpack short ID',
    demandOption: true,
  })
  .option('icons', {
    alias: 'i',
    type: 'string',
    describe: 'Path to folder with icons from E2E-E-icons tool',
  })
  .option('overwrite', {
    alias: 'o',
    type: 'boolean',
    describe: 'Should overwrite .png files?',
    default: true,
  })
  .parseSync()

init()
async function init() {
  let log = category('Preparation')

  if (argv.overwrite) {
    log('Generating placeholders...')
    await generatePlaceholders()
  }
  else {
    const label = 'Skipping overwriting, init present icons...'
    log(label)
    await initOld((current, total, skipped) => log(
      `${label}\n${chalk.green(current)} / ${chalk.hex('#007700')(total)} ${chalk.gray('skipped:')} ${chalk.hex('#888888')(skipped)}`,
    ))
  }

  log = category('JEIExporter')
  log('Open JEIExporter nameMap.json...')
  const nameMap = getNameMap(
    readFileSync(join(argv.mc, '/exports/nameMap.json'), 'utf8'),
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
  fast_glob.sync('*.png', { cwd: 'i/placeholder' }).forEach((file) => {
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
  const newModNames: Record<string, string> = JSON.parse(
    readFileSync(join(argv.mc, 'crafttweaker_raw.log'), 'utf8'),
  ).modNames
  for (const [id, name] of Object.entries(newModNames)) {
    asset.mods[id] = name
  }

  log('Generating modpacks data')
  asset.modpacks[argv.modpack] = Object.keys(newModNames)
    .filter(k => asset.items[k] && Object.keys(asset.items[k]).length)
    .sort()

  log('Saving assets ...')
  await saveAssets()
}
