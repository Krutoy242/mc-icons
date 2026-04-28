import type Buffer from 'node:buffer'
import sharp from 'sharp'

export interface Pixels {
  width: number
  height: number
  data: Buffer
}

const CACHE_CAPACITY = 256
const cache = new Map<string, Promise<Pixels | undefined>>()

export const CELL_COLS = 8
export const CELL_ROWS = 4
export const SUBPX_PER_CELL_X = 2
export const SUBPX_PER_CELL_Y = 4
// Native MC textures are 16×16; we sample 1:1 with no supersampling to avoid
// lanczos ringing on the alpha channel (which produced ghost halos around
// transparent pixels). Subpixel grid is 2×4 per cell ⇒ 16×16 total.
export const SUPERSAMPLE = 1
export const PICTURE_W = CELL_COLS * SUBPX_PER_CELL_X * SUPERSAMPLE // 16
export const PICTURE_H = CELL_ROWS * SUBPX_PER_CELL_Y * SUPERSAMPLE // 16

function touch(key: string, value: Promise<Pixels | undefined>): void {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size > CACHE_CAPACITY) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined)
      cache.delete(oldest)
  }
}

async function read(path: string): Promise<Pixels | undefined> {
  try {
    const { data, info } = await sharp(path)
      .ensureAlpha()
      .resize(PICTURE_W, PICTURE_H, { kernel: 'lanczos3', fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true })
    return { width: info.width, height: info.height, data }
  }
  catch {
    return undefined
  }
}

export function loadPixels(path: string): Promise<Pixels | undefined> {
  const cached = cache.get(path)
  if (cached) {
    touch(path, cached)
    return cached
  }
  const promise = read(path)
  touch(path, promise)
  return promise
}
