export const sNbtMap: { [hash: string]: string } = {}

const existsNbt = new Set<string>()

export function addNbt(nbtHash: string | undefined, sNbt: string | undefined) {
  if (nbtHash && sNbt && !existsNbt.has(sNbt)) {
    existsNbt.add(sNbt)
    sNbtMap[nbtHash] = sNbt
  }
}

export function getsNbt(nbtHash: string | undefined) {
  return nbtHash ? sNbtMap[nbtHash] : undefined
}
