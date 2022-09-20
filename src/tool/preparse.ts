import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join, parse } from 'path'

import fast_glob from 'fast-glob'
import * as fs from 'fs-extra'
import _ from 'lodash'
import getNameMap from 'mc-gatherer/build/main/from/jeie/NameMap'
import iconIterator, { ItemIcon } from 'mc-iexporter-iterator'
import yargs from 'yargs'

import { loadJson, saveJson } from '..'
import { tree } from '../Tree'

import {
  appendImage,
  grabImages,
  ImageBase,
  imageHashMap,
  initOld,
} from './images'
import { category } from './log'
import { generateNames } from './names'
import { addNbt, sNbtMap } from './nbt'

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

  log('Open nameMap.json...')
  const nameMap = getNameMap(
    readFileSync(join(argv.mc, '/exports/nameMap.json'), 'utf8')
  )

  if (!argv.overwrite) {
    log('Skipping overwriting...')
    initOld(readFileSync('./assets/images.json', 'utf8'))
  }

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
  let total = 0
  const jeiePath = join(argv.mc, '/exports/items')
  await handleJEIEFile('mekanism.api.gas.GasStack', 'gas', /^gas__/)
  await handleJEIEFile('fluid', 'fluid')
  await handleJEIEFile('item')

  function logFileAdd(isAdded: boolean, wholeLength: number) {
    log(
      `Files: ${++total} / ${wholeLength}, skipped: ${
        isAdded ? skipped : ++skipped
      }`
    )
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

  log('Saving modpacks data')
  const modpacks: { [short: string]: string[] } = loadJson(
    'assets/modpacks.json'
  )
  modpacks[argv.modpack] = Object.keys(tree.export())
  saveJson('assets/modpacks.json', modpacks)

  log('Saving items, nbt, images ...')
  saveJson('assets/items.json', tree.export())
  saveJson('assets/nbt.json', sNbtMap)
  saveJson('assets/images.json', imageHashMap)

  log('Loading mods names ...')
  const { modNames } = JSON.parse(
    fs.readFileSync(join(argv.mc, 'crafttweaker_raw.log'), 'utf8')
  )
  log('Generating names ...')
  const genNames = generateNames(nameMap)
  log('Saving names ...')
  saveJson('assets/names.json', {
    mods: modNames,
    items: genNames,
  })
}
