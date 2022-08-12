import { Tree } from './Tree'
import { imageHashMap } from './tool/images'
import { sNbtMap } from './tool/nbt'

import { loadJson } from '.'

let assetsItems: Tree
const nbtHashMap: { [sNbt: string]: string } = {}
let assetsImages: typeof imageHashMap

let initialized = false
function init() {
  if (initialized) return
  initialized = true

  assetsItems ??= loadJson('src/assets/items.json')
  const assetsNbt: typeof sNbtMap = loadJson('src/assets/nbt.json')
  assetsImages ??= loadJson('src/assets/images.json')

  Object.entries(assetsNbt).forEach(([nbtHash, sNbt]) => {
    nbtHashMap[sNbt] ??= assetsImages[nbtHash]
  })
}

export default function getIcon(
  base: [source: string, entry: string, meta?: number, sNbt?: string]
): string | undefined {
  init()

  const [source, entry, meta, sNbt] = base
  const definition = assetsItems[source]?.[entry]

  if (!definition) return // No item at all

  let stack = definition[meta || 0]
  if (stack === undefined) {
    // try to find any meta
    stack = Object.values(definition)[0]
  }

  const getReport = (reason: string) =>
    `Looking for item ${source}:${entry}:${meta}:${sNbt}, ` +
    `but ${reason}. This could only happen if .json file generated wrongly`

  if (stack === undefined)
    throw new Error(getReport('definition for this item doesnt have any metas'))

  let imageHash: string
  let nbtHash: string | undefined
  if (!sNbt) {
    imageHash = stack[''] ?? Object.values(stack)[0]
  } else {
    nbtHash = nbtHashMap[sNbt]
    imageHash = stack[nbtHash ?? ''] ?? Object.values(stack)[0]
  }

  if (imageHash === undefined)
    throw new Error(getReport('stack for this item doesnt have any nbts'))

  const result = assetsImages[imageHash]

  if (!result)
    throw new Error(getReport('we found image hash with no corresponding path'))

  return result
}
