import type { Tree } from './types'

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import fse from 'fs-extra'
import { Memoize } from 'typescript-memoize'

import { tree } from './tree'

const { readFileSync, writeFile, existsSync } = fse

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

function loadAsset(key: AssetKey) {
  const fPath = resolve(dirname(fileURLToPath(import.meta.url)), `../../assets/${key}.json`)
  if (!existsSync(fPath))
    return {}
  return JSON.parse(readFileSync(fPath, 'utf8'))
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

  @Memoize()
  public get nbtHash(): { [sNbt: string]: string } {
    return Object.fromEntries(Object.entries(this.nbt).map(([k, v]) => [v, k]))
  }

  @Memoize()
  public get names_low() {
    return Object.fromEntries(
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
        if (meta === '32767')
          return undefined
        const nbtHash = asset.nbtHash[rest.join(':')]
        const hash = tree.get(source, entry, meta, nbtHash)
        if (!hash)
          return undefined
        const imgPath = asset.images[hash]
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

  await Promise.all(
    (Object.keys(store) as AssetKey[])
      .filter(Boolean)
      .map(key =>
        writeFile(`assets/${key}.json`, JSON.stringify(store[key], null, 2)),
      ),
  )
}
