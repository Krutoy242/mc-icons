import { readFileSync, writeFileSync } from 'fs-extra'

export * from './getIcon'

export const loadJson = (f: string) => JSON.parse(readFileSync(f, 'utf8'))
export const saveJson = (f: string, obj: any) =>
  writeFileSync(f, JSON.stringify(obj, null, 2))
