export const sNbtMap: { [hash: string]: string } = {}

export function addNbt(nbtHash: string | undefined, sNbt: string | undefined) {
  if (nbtHash && sNbt) sNbtMap[nbtHash] = sNbt
}

export function getsNbt(nbtHash: string | undefined) {
  return nbtHash ? sNbtMap[nbtHash] : undefined
}
