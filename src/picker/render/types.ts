import type { Lab, RGB } from '../color/oklab'

// Subpixels are stored row-major within a cell. With a 2-col × 4-row grid
// the indices are:
//   0 1   ← row 0 (top)
//   2 3   ← row 1
//   4 5   ← row 2
//   6 7   ← row 3 (bottom)
// In general: idx = row * SUBPX_PER_CELL_X + col.
export interface Sub {
  rgb: RGB
  lab: Lab
  coverage: number // 0..1, alpha of the subpixel block
}

// A glyph candidate: a Unicode char and how much of each subpixel is "fg".
// weights[i] in [0,1]: 0 = fully bg, 1 = fully fg, intermediate = visual mix.
// The array length matches the cell's subpixel grid (currently 2 cols × 4
// rows = 8, indexed row-major: idx = row*2 + col, top-left first).
//
// `singleColor: true` means the glyph is rendered with one colour only (no
// bgRgb). `singleColor: false` means we paint fg + bg pair. Mixed cells (with
// transparent subpixels) demand singleColor=true, otherwise the bg colour
// would leak into the silhouette.
export interface GlyphCandidate {
  char: string
  weights: number[]
  // If true, even when a bg cluster exists we render only fg (used by the
  // single-colour shapes like ●). Mostly false — most glyphs are happy in
  // either mode and the painter decides based on cell state.
  forceSingleColor?: boolean
}
