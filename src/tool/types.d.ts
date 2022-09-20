export interface HashMap {
  [hash: string]: string
}

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
