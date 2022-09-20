export interface Tree {
  [source: string]: {
    [entry: string]: {
      [meta: string]: {
        [nbtHash: string]: string /** Image hash */
      }
    }
  }
}

export type Base = [string, string, number, string]

export class ConstituentTree {
  // source -> entry -> meta -> nbtHash -> imgHash
  public tree: Tree = {}

  /**
   * Add new item entry to tree
   * @returns new imgHash if item already exist
   */
  public add(item: {
    source: string
    entry: string
    meta?: number
    nbtHash?: string
    imgHash: string
  }): string | undefined {
    let { source, entry, meta, nbtHash } = item
    meta ??= 0
    nbtHash ??= ''

    const imgHash = this.tree[source]?.[entry]?.[meta]?.[nbtHash]
    if (imgHash) return imgHash
    ;(((this.tree[source] ??= {})[entry] ??= {})[meta] ??= {})[nbtHash] =
      item.imgHash
    return undefined
  }

  import(newTree: Tree) {
    this.tree = newTree
  }

  export() {
    return this.tree
    // const exportTree: any = {}

    // function metaIsSingle(meta: {
    //   [key: string]: string | undefined
    // }): boolean {
    //   if (Object.entries(meta).length === 1) {
    //     const [k] = Object.entries(meta)[0]
    //     if (k === '') return true
    //   }
    //   return false
    // }

    // for (const [key_source, source] of Object.entries(this.tree)) {
    //   exportTree[key_source] = {}

    //   for (const [key_entry, entry] of Object.entries(source)) {
    //     exportTree[key_source][key_entry] = {}
    //     // const entryLen = Object.entries(entry).length
    //     // if (entryLen === 1) {
    //     //   const [k, metaDict] = Object.entries(entry)[0]
    //     //   if (k === '0' && metaIsSingle(metaDict)) continue
    //     // }

    //     for (const [key_meta, metaDict] of Object.entries(entry)) {
    //       exportTree[key_source][key_entry][key_meta] = {}

    //       // if (metaIsSingle(metaDict)) continue

    //       for (const [key_hash, hash] of Object.entries(metaDict)) {
    //         exportTree[key_source][key_entry][key_meta][key_hash] = hash
    //       }
    //     }
    //   }
    // }

    // return exportTree
  }
}

export const tree = new ConstituentTree()
