/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { readFileSync, writeFile } from 'fs-extra'

import { Tree } from './types'

const store = {
  /** Map of `imgHash: source/entry__meta` */
  images: <{ [imgHash: string]: string } | undefined>undefined,

  /** Tree of items and their image hashes */
  items: <Tree | undefined>undefined,

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

function loadAsset(key: AssetKey) {
  return JSON.parse(readFileSync(`assets/${key}.json`, 'utf8'))
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

  private _nbtHash!: { [sNbt: string]: string }
  public get nbtHash(): AssetStorage['nbt'] {
    if (this._nbtHash) return this._nbtHash

    this._nbtHash = {}
    Object.entries(this.nbt).forEach(([nbtHash, sNbt]) => {
      this._nbtHash[sNbt] = nbtHash
    })
    return this._nbtHash
}

const keys = Object.keys(asset) as (keyof typeof asset)[]

export async function loadAssets() {
  const list = await Promise.all(
    keys.map((key) => import(`../../assets/${key}.json`))
  )
  keys.forEach((key, i) => (asset[key] = list[i].default))
}

export const asset = new Asset()

const lenNaturalSort = (a: string, b: string) =>
  a.length - b.length ||
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

export async function saveAssets() {
  // Sort names
  if (store.names) {
    const newNames: typeof store.names = {}
    const sortedKeys = Object.keys(store.names).sort(lenNaturalSort)
  for (const name of sortedKeys) {
      newNames[name] = store.names[name].sort()
  }
    store.names = newNames
  }

  await Promise.all(
    (Object.keys(store) as AssetKey[])
      .filter(Boolean)
      .map((key) =>
        writeFile(`assets/${key}.json`, JSON.stringify(store[key], null, 2))
    )
  )
}
