export interface HashMap {
  [hash: string]: string
}

export interface Tree<T> {
  [source: string]: {
    [entry: string]: {
      [meta: string]: {
        [key: string]: T /** Image hash */
      }
    }
  }
}

export type Base = [string, string, string, string]
