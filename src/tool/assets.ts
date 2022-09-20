/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { writeFile } from 'fs-extra'

import { Tree } from './types'

export const asset = {
  /** Map of `imgHash: source/entry__meta` */
  images: <{ [imgHash: string]: string }>{},

  /** Tree of items and their image hashes */
  items: <Tree>{},

  /** Mods that have items in specified modpack */
  modpacks: <{ [modShortand: string]: string[] }>{},

  /** Map of mod names */
  mods: <{ [modId: string]: string }>{},

  /** List of full serialized items based on their name */
  names: <{ [name: string]: string[] }>{},

  /** NbtHash: sNbt */
  nbt: <{ [nbtHash: string]: string }>{},
}

const keys = Object.keys(asset) as (keyof typeof asset)[]

export async function loadAssets() {
  const list = await Promise.all(
    keys.map((key) => import(`../../assets/${key}.json`))
  )
  keys.forEach((key, i) => (asset[key] = list[i].default))
}

const lenNaturalSort = (a: string, b: string) =>
  a.length - b.length ||
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

export async function saveAssets() {
  // Sort names
  const newNames: typeof asset.names = {}
  const sortedKeys = Object.keys(asset.names).sort(lenNaturalSort)
  for (const name of sortedKeys) {
    newNames[name] = asset.names[name].sort()
  }
  asset.names = newNames

  await Promise.all(
    keys.map((key) =>
      writeFile(`assets/${key}.json`, JSON.stringify(asset[key], null, 2))
    )
  )
}
