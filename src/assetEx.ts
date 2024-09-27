import type { CliOpts } from './cli'

import type { DictEntry } from './searcher'
import type { Tree } from './tool/types'
import { baseFromID } from './base'
import { asset } from './tool/assets'

// TODO: Gas and fluid should not be in every modpack
const whitelistSources = ['gas', 'fluid', 'placeholder']

function abbr1(str: string) {
  return str
    .replace(/ ([a-z])/g, (_, r) => r.toUpperCase()) // Capitalize first letter
    .replace(/[\Wa-z]/g, '') // Remove special chars and low
    .toLocaleLowerCase()
}

export class AssetEx {
  private _nameDictionary!: DictEntry[]
  private lookupTree!: Tree<DictEntry>

  constructor(public argv: CliOpts) {}

  public getById(id: string): DictEntry | undefined {
    if (!this.lookupTree)
      this.initDict()
    const [source, entry, meta, sNbt] = baseFromID(id)
    const def = this.lookupTree[source]?.[entry]
    if (!def)
      return undefined
    const dm
      = meta && meta !== '*' && meta !== '32767'
        ? def[meta]
        : def[''] ?? def[0] ?? def['0'] ?? def['*'] ?? Object.values(def)[0]
    if (!dm)
      return undefined
    return sNbt ? dm[sNbt] : dm[''] ?? dm['{}'] ?? Object.values(dm)[0]
  }

  private initDict() {
    this.lookupTree = {}
    this._nameDictionary = []

    // Init unique names
    for (const [name, list] of Object.entries(asset.names)) {
      for (const id of list) {
        let [source, entry, meta, ...rest] = id.split(':')
        if (!whitelistSources.includes(source) && this.modpackMap && !this.modpackMap[source])
          continue

        meta ??= ''
        const sNbt = rest.join(':')
        const modname = asset.mods[source] || source

        const newEntry: DictEntry = {
          name,
          id,
          source,
          entry,
          meta,
          sNbt,
          modname,
          name_low: name.toLowerCase(),
          modAbbr: abbr1(modname),
        }

        this._nameDictionary.push(newEntry)
        ;(((this.lookupTree[source] ??= {})[entry] ??= {})[meta] ??= {})[sNbt]
          = newEntry
      }
    }
  }

  private _modpackMap: { [source: string]: true } | undefined
  public get modpackMap() {
    if (!this.argv.modpack)
      return undefined

    if (this._modpackMap)
      return this._modpackMap

    const sourcesList = asset.modpacks[this.argv.modpack]
    if (!sourcesList?.length)
      throw new Error(`This modpack didnt exist: ${this.argv.modpack}`)

    return this._modpackMap = Object.fromEntries(
      sourcesList.map(s => [s, true]),
    )
  }

  public get nameDictionary(): DictEntry[] {
    if (!this._nameDictionary)
      this.initDict()
    return this._nameDictionary
  }
}
