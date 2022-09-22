export type Base = [source: string, entry: string, meta?: string, sNbt?: string]

export function baseFromID(id: string): Base {
  let [source, entry, meta, ...rest] = id.split(':')
  return [source, entry, meta, rest.length ? rest.join(':') : undefined]
}
