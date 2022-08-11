import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join, parse } from 'path'

import fast_glob from 'fast-glob'
import * as fs from 'fs-extra'
import _ from 'lodash'
import getNameMap from 'mc-gatherer/build/main/from/jeie/NameMap'
import iconIterator, { Iteratives } from 'mc-iexporter-iterator'
import yargs from 'yargs'

import { tree } from '../Tree'

import { appendImage, grabImages, imageHashMap } from './images'
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
  .option('icons', {
    alias: 'i',
    type: 'string',
    describe: 'Path to folder with icons',
    demandOption: true,
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

  log('Generating nbt hash map...')
  Object.entries(nameMap).forEach(([id, nameData]) => {
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
  await handleJEIEFile('fluid', 'fluid')
  await handleJEIEFile('item')

  function logFileAdd(isAdded: boolean, wholeLength: number) {
    log(
      `Files: ${++total} / ${wholeLength}, skipped: ${
        isAdded ? skipped : ++skipped
      }`
    )
  }

  async function handleJEIEFile(subfolder: string, source?: string) {
    const folder = join(jeiePath, subfolder)
    const files = fast_glob.sync('*.png', { cwd: folder }) // .slice(0, 400)

    await grabImages(
      files,
      (file) => {
        const name = parse(file).name
        return {
          filePath: join(folder, file),
          fileName: file,
          ...(source
            ? {
                source,
                entry: name,
                skipSubstr: true,
              }
            : parseJEIEName(name)),
        }
      },
      logFileAdd
    )
  }

  // eslint-disable-next-line require-atomic-updates
  log = category('Icon Exporter')
  log('Getting array...')

  const iconExporter: Iteratives[] = []
  // let maxIter = 1000
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

  // eslint-disable-next-line require-atomic-updates
  log = category('Export')
  log('Saving ...')

  fs.writeFileSync(
    'src/assets/items.json',
    JSON.stringify(tree.export(), null, 2)
  )
  fs.writeFileSync('src/assets/nbt.json', JSON.stringify(sNbtMap, null, 2))
  fs.writeFileSync(
    'src/assets/images.json',
    JSON.stringify(imageHashMap, null, 2)
  )
  fs.writeFileSync(
    'src/assets/names.json',
    generateNames(
      fs.readFileSync(join(argv.mc, 'crafttweaker_raw.log'), 'utf8')
    )
  )
}
