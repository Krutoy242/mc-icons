import { converter } from 'culori'

export interface RGB { r: number, g: number, b: number }
export interface Lab { L: number, a: number, b: number }

const toOklab = converter('oklab')

// Cache: 24-bit RGB → Lab. Picker shows the same icons many times, this LUT
// pays off quickly. ~16M keys is too many; we cache lazily as we encounter.
const labCache = new Map<number, Lab>()

export function rgbToLab(r: number, g: number, b: number): Lab {
  const key = (r << 16) | (g << 8) | b
  const hit = labCache.get(key)
  if (hit)
    return hit
  const ok = toOklab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })
  const lab: Lab = { L: ok!.l!, a: ok!.a!, b: ok!.b! }
  if (labCache.size < 65536)
    labCache.set(key, lab)
  return lab
}

export function labDist2(a: Lab, b: Lab): number {
  const dL = a.L - b.L
  const da = a.a - b.a
  const db = a.b - b.b
  return dL * dL + da * da + db * db
}

// OkLab is perceptually uniform-ish, linear interpolation is OK here.
export function mixLab(fg: Lab, bg: Lab, w: number): Lab {
  return {
    L: bg.L + (fg.L - bg.L) * w,
    a: bg.a + (fg.a - bg.a) * w,
    b: bg.b + (fg.b - bg.b) * w,
  }
}

// sRGB linear mix — useful when we need to actually render a synthetic colour
// (currently unused, kept for completeness).
function srgbToLin(c: number): number {
  const x = c / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}
function linToSrgb(x: number): number {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * (x ** (1 / 2.4)) - 0.055
  return Math.max(0, Math.min(255, Math.round(v * 255)))
}
export function mixRgb(fg: RGB, bg: RGB, w: number): RGB {
  return {
    r: linToSrgb(srgbToLin(bg.r) + (srgbToLin(fg.r) - srgbToLin(bg.r)) * w),
    g: linToSrgb(srgbToLin(bg.g) + (srgbToLin(fg.g) - srgbToLin(bg.g)) * w),
    b: linToSrgb(srgbToLin(bg.b) + (srgbToLin(fg.b) - srgbToLin(bg.b)) * w),
  }
}

export function avgRgb(colors: RGB[]): RGB {
  let r = 0
  let g = 0
  let b = 0
  for (const c of colors) {
    r += c.r
    g += c.g
    b += c.b
  }
  const n = colors.length || 1
  return { r: (r / n) | 0, g: (g / n) | 0, b: (b / n) | 0 }
}
