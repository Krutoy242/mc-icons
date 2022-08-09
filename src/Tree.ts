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

  public add(item: Item): void {
    ;(((this.tree[item.source] ??= {})[item.entry] ??= {})[item.meta] ??= {})[
      item.hash
    ] = item.nbt
  }
}

export const tree = new ConstituentTree()
