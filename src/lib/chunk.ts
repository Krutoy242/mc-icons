import process from 'node:process'
import { chunk } from './fp.js'

export async function callInChunks<T>(arr: T[], call: (value: T) => Promise<any>, size = 64) {
  for (const group of chunk(arr, size)) {
    await Promise.all(group.map(call))
    process.stdout.write('.')
  }
}
