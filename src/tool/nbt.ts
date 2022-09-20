import { asset } from './assets'

const existsNbt = new Set<string>()

export function addNbt(nbtHash: string | undefined, sNbt: string | undefined) {
  if (nbtHash && sNbt && !existsNbt.has(sNbt)) {
    existsNbt.add(sNbt)
    asset.nbt[nbtHash] = sNbt
  }
}

export function getsNbt(nbtHash: string | undefined) {
  return nbtHash ? asset.nbt[nbtHash] : undefined
}
