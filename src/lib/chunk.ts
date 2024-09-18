import process from 'node:process'

export async function callInChunks<T>(arr: T[], call: (value: T) => Promise<any>, size = 64) {
  const filtered = chunkArray(arr, size)

  for (const chunk of filtered) {
    await Promise.all(chunk.map(call))
    process.stdout.write('.')
  }
}

function chunkArray<T>(array: readonly T[], size = 64): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size))
}
