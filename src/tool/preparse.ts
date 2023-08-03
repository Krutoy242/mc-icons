import { readFileSync } from 'fs'
import { join } from 'path'

import chalk from 'chalk'
import fast_glob from 'fast-glob'
import * as fs from 'fs-extra'
import _ from 'lodash'
import getNameMap from 'mc-gatherer/build/main/from/jeie/NameMap'
import iconIterator, { ItemIcon } from 'mc-iexporter-iterator'
import yargs from 'yargs'

import { asset, saveAssets } from './assets'
import { appendImage, grabImages, ImageBase, initOld } from './images'
import { category } from './log'
import { appendNames } from './names'
import { addNbt } from './nbt'
import { generatePlaceholders } from './placeholder'

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

function parseJEIEName(fileName: string) {
  const groups = fileName.match(
    /(?<source>.+?)__(?<entry>.+?)__(?<meta>\d+)(__(?<hash>.+))?/
  )?.groups

  if (!groups) throw new Error('File Name cannot be parsed: ' + fileName)
  return {
    source: groups.source,
    entry: groups.entry,
    meta: Number(groups.meta) || 0,
    nbtHash: groups.hash,
  }
}

init()
async function init() {
  let log = category('JEIExporter')

  if (!argv.overwrite) {
    log('Skipping overwriting...')
    initOld()
  } else {
    log('Generating placeholders...')
    await generatePlaceholders()
  }

  log('Open JEIExporter nameMap.json...')
  const nameMap = getNameMap(
    readFileSync(join(argv.mc, '/exports/nameMap.json'), 'utf8')
  )

  log('Generating nbt hash map...')
  Object.entries(nameMap).forEach(([id, nameData]) => {
    if (id === 'info') return
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
  let total = 0
  const jeiePath = join(argv.mc, '/exports/items')
  await handleJEIEFile('mekanism.api.gas.GasStack', 'gas', /^gas__/)
  await handleJEIEFile('fluid', 'fluid')
  await handleJEIEFile('item')

  function logFileAdd(isAdded: boolean, wholeLength: number, base: ImageBase) {
    total++
    copied += Number(isAdded)
    skipped += Number(!isAdded)
    if (total % 100 !== 0) return
    const files = chalk.hex('#0e7182')(`${total} / ${wholeLength}`)
    const s_copied = `copied: ${copied}`
    const s_skipped = `skipped: ${skipped}`
    const current = `current: ${chalk.hex('#0e8257')(base.source)}`
    log(`Files: ${files}, ${s_copied}, ${s_skipped}, ${current}`)
  }

  async function handleJEIEFile(
    subfolder: string,
    source?: string,
    entry_filter?: RegExp
  ) {
    const folder = join(jeiePath, subfolder)
    const files = fast_glob.sync('./**/*.png', { cwd: folder }) // .slice(0, 400)

    const getBase: (icon: string) => ImageBase = (file) => {
      const name = file.replace(/\.png$/, '')
      const base = source
        ? {
            source,
            entry: !entry_filter ? name : name.replace(entry_filter, ''),
            skipSubstr: true,
          }
        : parseJEIEName(name)
      return {
        filePath: join(folder, file),
        fileName: file,
        ...base,
      }
    }

    await grabImages(files, getBase, logFileAdd)
  }

  if (argv.icons) {
    // eslint-disable-next-line require-atomic-updates
    log = category('Icon Exporter')
    log('Getting array...')
    total = 0
    const iconExporter: ItemIcon[] = []
    let maxIter = 1000
    for (const o of iconIterator(argv.icons)) {
      iconExporter.push(o)
      if (o.sNbt && o.sNbt !== '{}') addNbt(o.hash, o.sNbt)
      // if (--maxIter <= 0) break
    }
    await grabImages(
      iconExporter,
      (icon) => ({
        ...icon,
        source: icon.namespace,
        entry: icon.name,
        fileName: icon.fileName + '.png',
      }),
      logFileAdd
    )
  }

  // eslint-disable-next-line require-atomic-updates
  log = category('Export')

  log('Generating item names ...')
  appendNames(nameMap)

  log('Generating mod names ...')
  const newModNames: Record<string, string> = JSON.parse(
    fs.readFileSync(join(argv.mc, 'crafttweaker_raw.log'), 'utf8')
  ).modNames
  for (const [id, name] of Object.entries(newModNames)) {
    asset.mods[id] = name
  }

  log('Generating modpacks data')
  asset.modpacks[argv.modpack] = Object.keys(newModNames)
    .filter((k) => asset.items[k] && Object.keys(asset.items[k]).length)
    .sort()

  log('Saving assets ...')
  await saveAssets()
}
