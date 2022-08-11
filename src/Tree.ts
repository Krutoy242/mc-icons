export class Item {
  constructor(
    public source: string,
    public entry: string,
    public meta: number,
    public hash: string,
    public nbt?: string
  ) {}
}

export interface Tree {
  [source: string]: {
    [entry: string]: {
      [meta: string]: {
        [nbtHash: string]: string | undefined
      }
    }
  }
}

export type Base = [string, string, number, string]

export class ConstituentTree {
  // source -> entry -> meta -> nbtHash -> sNBT
  public tree: Tree = {}

  public add(item: Item): boolean {
    if (this.tree[item.source]?.[item.entry]?.[item.meta]?.[item.hash])
      return false
    ;(((this.tree[item.source] ??= {})[item.entry] ??= {})[item.meta] ??= {})[
      item.hash
    ] = item.nbt
    return true
  }

  export() {
    const exportTree: Tree = {}

    function metaIsSingle(meta: {
      [key: string]: string | undefined
    }): boolean {
      if (Object.entries(meta).length === 1) {
        const [k] = Object.entries(meta)[0]
        if (k === '') return true
      }
      return false
    }

    for (const [key_source, source] of Object.entries(this.tree)) {
      exportTree[key_source] = {}

      for (const [key_entry, entry] of Object.entries(source)) {
        exportTree[key_source][key_entry] = {}

        if (Object.entries(entry).length === 1) {
          const [k, metaDict] = Object.entries(entry)[0]
          if (k === '0' && metaIsSingle(metaDict)) continue
        }

        for (const [key_meta, metaDict] of Object.entries(entry)) {
          exportTree[key_source][key_entry][key_meta] = {}

          if (metaIsSingle(metaDict)) continue

          for (const [key_hash, hash] of Object.entries(metaDict)) {
            exportTree[key_source][key_entry][key_meta][key_hash] = hash ?? ''
          }
        }
      }
    }

    return exportTree
  }
}

export const tree = new ConstituentTree()
