import { asset } from './tool/assets'

/**
 * Get image path, example `minecraft/enchanted_book__0__1039e0ba`
 * @param base base item parts
 * @returns Shortened image path, without repo and extension
 * @example getIcon(['minecraft', 'enchanted_book', 0, '{StoredEnchantments:[{id:57,lvl:3s}]}'])
 * // Returns "minecraft/enchanted_book__0__1039e0ba"
 */
export function getIcon(
  base: [source: string, entry: string, meta?: number | string, sNbt?: string]
): string | undefined {
  const [source, entry, meta, sNbt] = base
  const definition = asset.items[source]?.[entry]

  if (!definition) return // No item at all

  let stack: typeof definition[0] | undefined = definition[meta || 0]

  // try to find any meta
  if (!stack) stack = Object.values(definition)[0]

  const getReport = (reason: string) =>
    `Looking for item ${source}:${entry}:${meta}:${sNbt}, ` +
    `but ${reason}. This could only happen if .json file generated wrongly`

  if (!stack)
    throw new Error(getReport('definition for this item doesnt have any metas'))

  let imageHash: string
  let nbtHash: string | undefined
  if (!sNbt) {
    imageHash = stack[''] ?? Object.values(stack)[0]
  } else {
    nbtHash = asset.nbtHash[sNbt]
    imageHash = stack[nbtHash ?? ''] ?? Object.values(stack)[0]
  }

  if (!imageHash)
    throw new Error(getReport('stack for this item doesnt have any nbts'))

  const result = asset.images[imageHash]

  if (!result)
    throw new Error(getReport('we found image hash with no corresponding path'))

  return result
}
