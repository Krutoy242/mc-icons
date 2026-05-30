import type { GlyphCandidate } from '../types'

// All glyphs are described against a 2-col × 4-row subpixel grid (8 cells),
// row-major top-to-bottom. Index = row * 2 + col.
//
//   0 1   ← row 0 (top)
//   2 3   ← row 1
//   4 5   ← row 2
//   6 7   ← row 3 (bottom)
//
// This finer vertical resolution (4 rows instead of 2) is what allows shapes
// like ●, ◤, ◢, ▃, ▆, etc. to actually look centred on/biased toward a
// specific band of the cell instead of always filling the full cell height.

type W = number[]

// ── Quadrants ───────────────────────────────────────────────────────────────
// 2×2 logical halves rendered onto the 2×4 grid: top half = rows 0-1,
// bottom half = rows 2-3. Bit i of the 4-bit mask drives subpixel i:
//   bit 0 = TL half, 1 = TR half, 2 = BL half, 3 = BR half.
const QUADRANT_GLYPHS: Record<number, string> = {
  0b0000: ' ',
  0b0001: '▘',
  0b0010: '▝',
  0b0011: '▀',
  0b0100: '▖',
  0b0101: '▌',
  0b0110: '▞',
  0b0111: '▛',
  0b1000: '▗',
  0b1001: '▚',
  0b1010: '▐',
  0b1011: '▜',
  0b1100: '▄',
  0b1101: '▙',
  0b1110: '▟',
  0b1111: '█',
}

function quadrantWeights(mask: number): W {
  const tl = (mask & 0b0001) ? 1 : 0
  const tr = (mask & 0b0010) ? 1 : 0
  const bl = (mask & 0b0100) ? 1 : 0
  const br = (mask & 0b1000) ? 1 : 0
  // top half twice (rows 0,1), bottom half twice (rows 2,3).
  return [tl, tr, tl, tr, bl, br, bl, br]
}

export const QUADRANTS: GlyphCandidate[] = Array.from({ length: 16 }, (_, m) => ({
  char: QUADRANT_GLYPHS[m],
  weights: quadrantWeights(m),
}))

// ── Diagonal triangles ──────────────────────────────────────────────────────
// Each weight is the analytical fraction of the subpixel rectangle covered
// by the half-plane defining the triangle. With cell normalised to [0,1]²:
//   ◤: x + y < 1   ◥: y < x   ◣: y > x   ◢: x + y > 1
// Subpixel rectangles are width 1/2 × height 1/4. Total coverage = 0.5 (half
// a cell), as expected for these glyphs.
export const TRIANGLES: GlyphCandidate[] = [
  { char: '◤', weights: [0, 0, 1, 0.5, 0.5, 0, 0, 0] },
  { char: '◥', weights: [0, 0, 0.5, 1, 0, 0.5, 0, 0] },
  { char: '◣', weights: [0, 0, 0.5, 0, 1, 0.5, 0, 0] },
  { char: '◢', weights: [0, 0, 0, 0.5, 0.5, 1, 0, 0] },
]

// ── Vertical bars (1/8 width steps) ─────────────────────────────────────────
// Subpixel columns are 4/8 each: left col covers x∈[0,4/8], right col x∈[4/8,1].
// Bars are uniform in y, so a single (wL, wR) pair is replicated across all
// four rows.
function leftBar(eighths: number): W {
  const wL = Math.min(1, Math.max(0, eighths / 4))
  const wR = Math.min(1, Math.max(0, (eighths - 4) / 4))
  return [wL, wR, wL, wR, wL, wR, wL, wR]
}
function rightBar(eighths: number): W {
  const wR = Math.min(1, Math.max(0, eighths / 4))
  const wL = Math.min(1, Math.max(0, (eighths - 4) / 4))
  return [wL, wR, wL, wR, wL, wR, wL, wR]
}

export const VERTICAL_BARS: GlyphCandidate[] = [
  { char: '▏', weights: leftBar(1) },
  { char: '▎', weights: leftBar(2) },
  { char: '▍', weights: leftBar(3) },
  { char: '▋', weights: leftBar(5) },
  { char: '▊', weights: leftBar(6) },
  { char: '▉', weights: leftBar(7) },
  { char: '▕', weights: rightBar(1) },
]

// ── Horizontal bars (1/8 height steps) ──────────────────────────────────────
// Bottom-anchored:  ▁ 1/8 … ▇ 7/8 (▄ at 4/8 lives in QUADRANTS).
// Top-anchored:     ▔ upper 1/8.
// Each row of the 2×4 grid covers 2/8 of the cell height. A bar of h/8
// height covers, per row r (0=top), a fraction:
//   bottom: clamp((row_bottom_y - (1 - h/8)) / (2/8), 0, 1)
//   top:    clamp(((h/8) - row_top_y) / (2/8), 0, 1)
// Then each row's weight is replicated across both columns.
function bottomBar(eighths: number): W {
  const rows: number[] = []
  for (let r = 0; r < 4; r++) {
    const rowTop = (2 * r) / 8
    const rowBot = (2 * (r + 1)) / 8
    const barTop = 1 - eighths / 8
    const overlap = Math.max(0, Math.min(rowBot, 1) - Math.max(rowTop, barTop))
    rows.push(overlap / (2 / 8))
  }
  return rows.flatMap(v => [v, v])
}
function topBar(eighths: number): W {
  const rows: number[] = []
  for (let r = 0; r < 4; r++) {
    const rowTop = (2 * r) / 8
    const rowBot = (2 * (r + 1)) / 8
    const barBot = eighths / 8
    const overlap = Math.max(0, Math.min(rowBot, barBot) - rowTop)
    rows.push(overlap / (2 / 8))
  }
  return rows.flatMap(v => [v, v])
}

export const HORIZONTAL_BARS: GlyphCandidate[] = [
  { char: '▁', weights: bottomBar(1) },
  { char: '▂', weights: bottomBar(2) },
  { char: '▃', weights: bottomBar(3) },
  { char: '▅', weights: bottomBar(5) },
  { char: '▆', weights: bottomBar(6) },
  { char: '▇', weights: bottomBar(7) },
  { char: '▔', weights: topBar(1) },
]

// ── Shade blocks ────────────────────────────────────────────────────────────
// Uniform partial coverage; rendered as fg over terminal-transparent bg.
export const SHADES: GlyphCandidate[] = [
  { char: '░', weights: Array.from({ length: 8 }).fill(0.25) as number[], forceSingleColor: true },
  { char: '▒', weights: Array.from({ length: 8 }).fill(0.5) as number[], forceSingleColor: true },
  { char: '▓', weights: Array.from({ length: 8 }).fill(0.75) as number[], forceSingleColor: true },
]

// ── Other glyphs ────────────────────────────────────────────────────────────
export const OTHER: GlyphCandidate[] = [
  { char: '●', weights: [0, 0, 0.67, 0.67, 0.67, 0.67, 0, 0] },
  { char: '◘', weights: [1, 1, 0.78, 0.78, 0.78, 0.78, 1, 1] },
  { char: '■', weights: [0, 0, 1, 1, 1, 1, 0, 0] },
  { char: '╱', weights: [0, 0.1, 0, 0.15, 0.15, 0, 0.1, 0] },
  { char: '╲', weights: [0.1, 0, 0.15, 0, 0, 0.15, 0, 0.1] },
]

// Full library used by the painter. Order is irrelevant — picker is
// brute-force argmin.
export const ALL_GLYPHS: GlyphCandidate[] = [
  ...QUADRANTS,
  ...TRIANGLES,
  ...OTHER,
  ...VERTICAL_BARS,
  ...HORIZONTAL_BARS,
  ...SHADES,
]
