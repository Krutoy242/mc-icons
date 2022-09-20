import { HashMap } from './types'

export const sNbtMap: HashMap = {}

const existsNbt = new Set<string>()

export function appendSNbtMap(newSNbtMap: HashMap) {
  for (const [k, v] of Object.entries(newSNbtMap)) {
    sNbtMap[k] = v
  }
}

export function addNbt(nbtHash: string | undefined, sNbt: string | undefined) {
  if (nbtHash && sNbt && !existsNbt.has(sNbt)) {
    existsNbt.add(sNbt)
    sNbtMap[nbtHash] = sNbt
  }
}

export function getsNbt(nbtHash: string | undefined) {
  return nbtHash ? sNbtMap[nbtHash] : undefined
}
