import type { Buffer } from 'node:buffer'
import type { Sub } from './types'
import { rgbToLab } from '../color/oklab'
import { SUPERSAMPLE } from '../pixels'

// Read a subpixel by averaging a SUPERSAMPLE×SUPERSAMPLE block of source
// pixels. Alpha is decisive for shape fidelity:
//   - coverage = mean(alpha)/255 — single source of truth for "is this on?"
//   - colour is alpha-weighted, so transparent pixels never pollute the hue.
// This is the alpha-first contract the rest of the pipeline relies on.
export function readSub(data: Buffer, w: number, sx: number, sy: number): Sub {
  let r = 0
  let g = 0
  let b = 0
  let aSum = 0
  let wSum = 0
  for (let dy = 0; dy < SUPERSAMPLE; dy++) {
    for (let dx = 0; dx < SUPERSAMPLE; dx++) {
      const idx = ((sy + dy) * w + (sx + dx)) * 4
      const a = data[idx + 3]
      aSum += a
      if (a > 0) {
        r += data[idx] * a
        g += data[idx + 1] * a
        b += data[idx + 2] * a
        wSum += a
      }
    }
  }
  const n = SUPERSAMPLE * SUPERSAMPLE
  const coverage = aSum / (n * 255)
  const rgb = wSum > 0
    ? { r: (r / wSum) | 0, g: (g / wSum) | 0, b: (b / wSum) | 0 }
    : { r: 0, g: 0, b: 0 }
  return { rgb, lab: rgbToLab(rgb.r, rgb.g, rgb.b), coverage }
}
