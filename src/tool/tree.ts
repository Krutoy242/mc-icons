import { asset } from './assets'

export const tree = {
  get(
    source: string,
    entry: string,
    meta?: number | string,
    nbtHash?: string,
  ): string | undefined {
    return asset.items[source]?.[entry]?.[
      !meta || meta === '32767' ? 0 : meta
    ]?.[nbtHash || '']
  },

  /**
   * Add new item entry to tree
   * @returns new imgHash if item already exist
   */
  add(item: {
    source: string
    entry: string
    meta?: number
    nbtHash?: string
    imgHash: string
  }): string | undefined {
    let { source, entry, meta, nbtHash } = item
    meta ??= 0
    nbtHash ??= ''

    const imgHash = asset.items[source]?.[entry]?.[meta]?.[nbtHash]
    if (imgHash) {
      return imgHash
    }(((asset.items[source] ??= {})[entry] ??= {})[meta] ??= {})[nbtHash]
      = item.imgHash
    return undefined
  },
}
