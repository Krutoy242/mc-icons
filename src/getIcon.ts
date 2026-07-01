import { firstOf } from './lib/firstOf'
import { asset, isAssetLoaded } from './tool/assets'
import { dbDefinition, dbImagePath, dbNbtHash } from './tool/db'

interface Definition { [meta: string]: { [nbt: string]: string } }

/** Where item/nbt/image data is read from while resolving an icon. */
interface Accessors {
  definition: (source: string, entry: string) => Definition | undefined
  nbtHash: (sNbt: string) => string | undefined
  imagePath: (hash: string) => string | undefined
}

// Direct database point-lookups — the shipped read path. Avoids materializing
// the multi-MB items/images/nbt objects for a handful of lookups.
const dbAccessors: Accessors = {
  definition: dbDefinition,
  nbtHash: dbNbtHash,
  imagePath: dbImagePath,
}

// In-memory objects — used during preparse, where these are being built and
// mutated and the database does not yet hold the new data.
const memoryAccessors: Accessors = {
  definition: (source, entry) => asset.items[source]?.[entry],
  nbtHash: sNbt => asset.nbtHash[sNbt],
  imagePath: hash => asset.images[hash],
}

/**
 * Get image path, example `minecraft/enchanted_book__0__1039e0ba`
 * @param base base item parts
 * @returns Shortened image path, without repo and extension
 * @example getIcon(['minecraft', 'enchanted_book', 0, '{StoredEnchantments:[{id:57,lvl:3s}]}'])
 * // Returns "minecraft/enchanted_book__0__1039e0ba"
 */
export function getIcon(
  base:
    | [source: string, entry: string, meta?: number | string, sNbt?: string]
    | { source: string, entry: string, meta?: number | string, sNbt?: string },
): string | undefined {
  let source: string
  let entry: string
  let meta: number | string | undefined
  let sNbt: string | undefined

  if (Array.isArray(base))
    [source, entry, meta, sNbt] = base
  else ({ source, entry, meta, sNbt } = base)

  // Read from memory while preparse is building it, otherwise from the database
  const acc = isAssetLoaded('items') ? memoryAccessors : dbAccessors

  const definition = acc.definition(source, entry)

  if (!definition)
    return // No item at all

  // Use requested meta, or fall back to any available meta
  const stack: Definition[string] | undefined = firstOf(definition, meta || 0)

  const getReport = (reason: string) =>
    `Looking for item ${source}:${entry}:${meta}:${sNbt}, `
    + `but ${reason}. This could only happen if .json file generated wrongly`

  if (!stack)
    throw new Error(getReport('definition for this item doesnt have any metas'))

  let imageHash: string
  let nbtHash: string | undefined
  if (!sNbt) {
    imageHash = firstOf(stack, '')!
  }
  else {
    nbtHash = acc.nbtHash(sNbt)
    imageHash = firstOf(stack, nbtHash ?? '')!
  }

  if (!imageHash)
    throw new Error(getReport('stack for this item doesnt have any nbts'))

  const result = acc.imagePath(imageHash)

  if (!result)
    throw new Error(getReport('we found image hash with no corresponding path'))

  return result
}
