import { Memoize } from 'typescript-memoize'

import { baseFromID } from './base'
import { CliOpts } from './cli'
import { DictEntry } from './searcher'
import { asset } from './tool/assets'
import { Tree } from './tool/types'

function abbr1(str: string) {
  return str
    .replace(/ ([a-z])/g, (_, r) => r.toUpperCase()) // Capitalize first letter
    .replace(/[^\w\d]|[ a-z]/g, '') // Remove special chars and low
    .toLocaleLowerCase()
}

export class AssetEx {
  private _nameDictionary!: DictEntry[]
  private lookupTree!: Tree<DictEntry>

  constructor(public argv: CliOpts) {}

  public getById(id: string): DictEntry | undefined {
    if (!this.lookupTree) this.initDict()
    const [source, entry, meta, sNbt] = baseFromID(id)
    return this.lookupTree[source]?.[entry]?.[meta ?? '']?.[sNbt ?? '']
  }

  private initDict() {
    this.lookupTree = {}
    this._nameDictionary = []

    // Init unique names
    for (const [name, list] of Object.entries(asset.names)) {
      for (const id of list) {
        let [source, entry, meta, ...rest] = id.split(':')
        if (this.modpackMap && !this.modpackMap[source]) continue
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
        ;(((this.lookupTree[source] ??= {})[entry] ??= {})[meta] ??= {})[sNbt] =
          newEntry
      }
    }
  }

  @Memoize()
  public get modpackMap(): { [source: string]: true } | undefined {
    if (!this.argv.modpack) return undefined

    const sourcesList = asset.modpacks[this.argv.modpack]
    if (!sourcesList?.length)
      throw new Error('This modpack didnt exist: ' + this.argv.modpack)

    // TODO: Gas and fluid should not be in every modpack
    return Object.fromEntries(
      sourcesList.concat(['gas', 'fluid', 'placeholder']).map((s) => [s, true])
    )
  }

  public get nameDictionary(): DictEntry[] {
    if (!this._nameDictionary) this.initDict()
    return this._nameDictionary
  }
}
