import { mkdirSync, readFileSync } from 'fs'
import { copyFile } from 'fs/promises'
import { join, parse } from 'path'

import fast_glob from 'fast-glob'
import * as fs from 'fs-extra'
import _ from 'lodash'
import getNameMap from 'mc-gatherer/build/main/from/jeie/NameMap'
import iconIterator from 'mc-iexporter-iterator'
import yargs from 'yargs'

import { Item, Tree, tree } from '../Tree'

import { category } from './log'

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

function addToTree(...args: ConstructorParameters<typeof Item>) {
  return tree.add(new Item(...args))
}

function parseJEIEName(fileName: string) {
  const groups = fileName.match(
    /(?<source>.+?)__(?<name>.+?)__(?<meta>\d+)(__(?<hash>.+))?/
  )?.groups

  if (!groups) throw new Error('File Name cannot be parsed: ' + fileName)
  return {
    source: groups.source,
    name: groups.name,
    meta: Number(groups.meta) || 0,
    hash: groups.hash,
  }
}

init()
async function init() {
  let log = category('JEIExporter')

  log('Generating nbt hash map...')

  const nameMap = getNameMap(
    readFileSync(join(argv.mc, '/exports/nameMap.json'), 'utf8')
  )

  const sNbtMap: { [hash: string]: string } = {}

  Object.entries(nameMap).forEach(([id, nameData]) => {
    const [_source, _name, _meta, nbtHash] = id.split(':')
    const sNbt: string = (nameData as any)?.tag
    if (nbtHash && sNbt) {
      sNbtMap[nbtHash] = sNbt
    }
  })

  log('Grabbing icons from places...')
  const jeiePath = join(argv.mc, '/exports/items')
  await handleJEIEFile('fluid', 'fluid')
  await handleJEIEFile('item')

  function handleJEIEFile(subfolder: string, source?: string) {
    const folder = join(jeiePath, subfolder)
    const files = fast_glob.sync('*.png', { cwd: folder })
    let total = 0
    return Promise.all(
      files.map((file, i) => {
        const name = parse(file).name
        let fileSource: string
        if (source) {
          addToTree(source, name, 0, '')
          fileSource = source
        } else {
          const base = parseJEIEName(name)
          fileSource = base.source
          addToTree(
            base.source,
            base.name,
            base.meta,
            base.hash,
            sNbtMap[base.hash]
          )
        }

        const dest = join('./i/', fileSource)
        if (i === 0) mkdirSync(dest)
        const newFileName = source
          ? file
          : file.substring(fileSource.length + 2)
        const p = copyFile(join(folder, file), join(dest, newFileName))
        p.then(() => log('Files: ', total++, '/', files.length))
        return p
      })
    )
  }

  // eslint-disable-next-line require-atomic-updates
  log = category('Icon Exporter')
  let i = 0
  let notAdded = 0
  for (const icon of iconIterator(argv.icons)) {
    const isAdded = addToTree(
      icon.namespace,
      icon.name,
      icon.meta,
      icon.hash ?? '',
      icon.sNbt
    )
    if (!isAdded) notAdded++
    if (i++ % 50 === 0) log('Iterating ', i, notAdded)
  }

  const exportTree: Tree = {}

  function metaIsSingle(meta: { [key: string]: string | undefined }): boolean {
    if (Object.entries(meta).length === 1) {
      const [k] = Object.entries(meta)[0]
      if (k === '') return true
    }
    return false
  }

  for (const [key_source, source] of Object.entries(tree.tree)) {
    exportTree[key_source] = {}

    for (const [key_entry, entry] of Object.entries(source)) {
      exportTree[key_source][key_entry] = {}

      if (Object.entries(entry).length === 1) {
        const [k, metaDict] = Object.entries(entry)[0]
        if (k === '0' && metaIsSingle(metaDict)) continue
      }

      for (const [key_meta, metaDict] of Object.entries(entry)) {
        exportTree[key_source][key_entry][key_meta] = {}

        if (metaIsSingle(metaDict)) continue

        for (const [key_hash, hash] of Object.entries(metaDict)) {
          exportTree[key_source][key_entry][key_meta][key_hash] = hash ?? ''
        }
      }
    }
  }

  fs.writeFileSync('src/parsed_items.json', JSON.stringify(exportTree, null, 2))

  // ##################################################################
  //
  // Item names
  //
  // ##################################################################

  const crafttweaker_raw = fs.readFileSync(
    join(argv.mc, 'crafttweaker_raw.log'),
    'utf8'
  )
  interface CrlogRawType {
    [mod: string]: [
      display: string,
      stack: string,
      snbt?: string,
      burnTime?: number
    ][]
  }
  const modMap: CrlogRawType = JSON.parse(crafttweaker_raw)?.all_items
  if (!modMap) {
    throw new Error('something wrong with parseCrafttweakerLog_raw')
  }

  const nameLines = _(modMap)
    .values()
    .flatten()
    .map(([display, stack, snbt]) => {
      if (display.startsWith('Cable Facade - ')) return undefined
      const [mod, id, meta] = stack.split(':')
      const arr: Array<string | number> = [
        display.replace(/§./g, ''),
        `${mod}:${id}`,
      ]
      const hasNBT = snbt && snbt !== '{}'
      if (meta || hasNBT) arr.push(meta ?? 0)
      if (hasNBT) arr.push(snbt)
      return JSON.stringify(arr)
    })
    .filter()
    .unshift(
      ..._(modMap)
        .entries()
        .map(([modName, [[, id]]]) =>
          JSON.stringify([modName, id.split(':')[0]])
        )
        .value()
    )

  fs.writeFileSync(
    'src/parsed_names.json',
    `[
${nameLines.join(',\n')}
]`
  )
}
