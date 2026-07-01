import type { Tree } from './types'

import { loadFromDb, writeStore } from './db'
import { tree } from './tree'

const store = {
  /** Map of `imgHash: source/entry__meta` */
  images: <{ [imgHash: string]: string } | undefined>undefined,

  /** Tree of items and their image hashes */
  items: <Tree<string> | undefined>undefined,

  /** Mods that have items in specified modpack */
  modpacks: <{ [modShortand: string]: string[] } | undefined>undefined,

  /** Map of mod names */
  mods: <{ [modId: string]: string } | undefined>undefined,

  /** List of full serialized items based on their name */
  names: <{ [name: string]: string[] } | undefined>undefined,

  /** NbtHash: sNbt */
  nbt: <{ [nbtHash: string]: string } | undefined>undefined,
}

type AssetKey = keyof typeof store

function loadAsset<K extends AssetKey>(key: K) {
  return loadFromDb(key)
}

/**
 * Whether an asset is already materialized in memory. `getIcon` uses this to
 * decide between the in-memory store (populated during preparse) and direct
 * database point-lookups (the shipped read path).
 */
export function isAssetLoaded(key: AssetKey): boolean {
  return store[key] !== undefined
}

type NoUndefinedField<T> = { [P in keyof T]-?: NonNullable<T[P]> }
type AssetStorage = NoUndefinedField<typeof store>

class Asset implements AssetStorage {
  public get images(): AssetStorage['images'] {
    return (store.images ??= loadAsset('images'))
  }

  public get items(): AssetStorage['items'] {
    return (store.items ??= loadAsset('items'))
  }

  public get modpacks(): AssetStorage['modpacks'] {
    return (store.modpacks ??= loadAsset('modpacks'))
  }

  public get mods(): AssetStorage['mods'] {
    return (store.mods ??= loadAsset('mods'))
  }

  public get names(): AssetStorage['names'] {
    return (store.names ??= loadAsset('names'))
  }

  public get nbt(): AssetStorage['nbt'] {
    return (store.nbt ??= loadAsset('nbt'))
  }

  // --------------------------------------------
  // Other Fields
  // --------------------------------------------

  private _nbtHash?: { [sNbt: string]: string }
  public get nbtHash() {
    return this._nbtHash ??= Object.fromEntries(Object.entries(this.nbt).map(([k, v]) => [v, k]))
  }

  private _names_low?: { [k: string]: string }
  public get names_low() {
    return this._names_low ??= Object.fromEntries(
      Object.entries(this.names).map(([k]) => [k.toLowerCase(), k]),
    )
  }
}

export const asset = new Asset()

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function lenNaturalSort(a: string, b: string) {
  return a.length - b.length || naturalSort(a, b)
}

export async function saveAssets() {
  // Sort names
  if (store.names) {
    const newNames: typeof store.names = {}
    const sortedKeys = Object.keys(store.names).sort(lenNaturalSort)
    for (const name of sortedKeys) {
      newNames[name] = store.names[name].sort(naturalSort)
    }
    store.names = newNames

    // Filter names without images and same images
    for (const name of Object.keys(store.names)) {
      const list = store.names[name]
      const imgPaths = list.map((id) => {
        const [source, entry, meta, ...rest] = id.split(':')

        // Skip wildcards
        if (meta === '32767')
          return undefined

        const nbtHash = asset.nbtHash[rest.join(':')]
        const hash = tree.get(source, entry, meta, nbtHash)

        // Item name+id doesnt have image
        if (!hash)
          return undefined

        // Do not store any items without texture
        const imgPath = asset.images[hash]

        // exception for null itself
        if (id === 'placeholder:null')
          return imgPath

        return imgPath === 'placeholder/null' ? undefined : imgPath
      })
      const arr = list.filter((_id, j) => {
        if (imgPaths[j] === undefined)
          return false
        for (let i = 0; i < j; i++) {
          if (imgPaths[i] === imgPaths[j])
            return false
        }
        return true
      })
      if (arr.length)
        store.names[name] = arr
      else delete store.names[name]
    }
  }

  writeStore(store as Parameters<typeof writeStore>[0])
}
