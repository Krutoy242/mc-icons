import type { Lab, RGB } from '../color/oklab'
import type { GlyphCandidate, Sub } from './types'
import chalk from 'chalk'
import { clusterColors } from '../color/cluster'
import { avgRgb, labDist2, mixLab, rgbToLab } from '../color/oklab'
import { ALL_GLYPHS } from './glyphs'

// Alpha (shape) is more important than colour — weights below.
const W_SHAPE = 1.0
const W_COLOR = 0.18

// Subpixel is "ink" if at least half-covered. Below that we treat it as
// transparent for cluster membership; coverage itself stays accurate and
// drives the shape-fit cost.
const SUB_OPAQUE_THRESHOLD = 0.5

interface ColorPair {
  fg: RGB
  fgLab: Lab
  bg?: RGB
  bgLab?: Lab
}

function meanRgbOfIndices(subs: Sub[], indices: number[]): RGB {
  return avgRgb(indices.map(i => subs[i].rgb))
}

// Build the candidate (fg, bg?) configurations to try for this cell.
// We consider:
//  - 1 colour: any single cluster centre as fg, no bg.
//  - 2 colours: each cluster as fg with the other as bg, both directions.
function buildColorPairs(subs: Sub[]): ColorPair[] {
  const opaqueIdx: number[] = []
  for (let i = 0; i < subs.length; i++) {
    if (subs[i].coverage >= SUB_OPAQUE_THRESHOLD)
      opaqueIdx.push(i)
  }
  if (opaqueIdx.length === 0)
    return []

  const labs = opaqueIdx.map(i => subs[i].lab)
  const cl = clusterColors(labs, 2)

  if (cl.centers.length === 1) {
    const fg = meanRgbOfIndices(subs, opaqueIdx)
    return [{ fg, fgLab: rgbToLab(fg.r, fg.g, fg.b) }]
  }

  // Group source-subpixel indices by cluster assignment.
  const groups: number[][] = [[], []]
  for (let k = 0; k < opaqueIdx.length; k++) {
    const c = cl.assignments[k]
    groups[c].push(opaqueIdx[k])
  }
  // Defensive: skmeans can in pathological cases leave a cluster empty.
  if (groups[0].length === 0 || groups[1].length === 0) {
    const fg = meanRgbOfIndices(subs, opaqueIdx)
    return [{ fg, fgLab: rgbToLab(fg.r, fg.g, fg.b) }]
  }

  const a = meanRgbOfIndices(subs, groups[0])
  const b = meanRgbOfIndices(subs, groups[1])
  const aLab = rgbToLab(a.r, a.g, a.b)
  const bLab = rgbToLab(b.r, b.g, b.b)
  return [
    { fg: a, fgLab: aLab, bg: b, bgLab: bLab },
    { fg: b, fgLab: bLab, bg: a, bgLab: aLab },
    { fg: a, fgLab: aLab },
    { fg: b, fgLab: bLab },
  ]
}

// Cost of drawing `glyph` with `pair` colours over the four target subpixels.
// Lower is better. Two terms:
//   shape: (predictedCoverage − targetCoverage)²  ── alpha fidelity
//   colour: ΔE_oklab² × overlap                   ── perceptual hue/luma fit
function cellCost(subs: Sub[], glyph: GlyphCandidate, pair: ColorPair): number {
  const hasBg = pair.bg !== undefined && pair.bgLab !== undefined
  let cost = 0
  for (let i = 0; i < subs.length; i++) {
    const w = glyph.weights[i]
    const t = subs[i]

    let predictedCov: number
    let predictedLab: Lab
    if (hasBg) {
      predictedCov = 1
      predictedLab = mixLab(pair.fgLab, pair.bgLab!, w)
    }
    else {
      predictedCov = w
      predictedLab = pair.fgLab
    }

    const dCov = predictedCov - t.coverage
    cost += dCov * dCov * W_SHAPE

    const overlap = Math.min(predictedCov, t.coverage)
    if (overlap > 0)
      cost += labDist2(predictedLab, t.lab) * overlap * W_COLOR
  }
  return cost
}

function paintGlyph(glyph: GlyphCandidate, pair: ColorPair): string {
  const { fg } = pair
  if (pair.bg !== undefined) {
    return chalk.rgb(fg.r, fg.g, fg.b).bgRgb(pair.bg.r, pair.bg.g, pair.bg.b)(glyph.char)
  }
  return chalk.rgb(fg.r, fg.g, fg.b)(glyph.char)
}

// Brute-force best glyph: ALL_GLYPHS × buildColorPairs is small (~25 × ≤4),
// trivial to evaluate per cell.
export function paintCell(subs: Sub[]): string {
  const pairs = buildColorPairs(subs)
  if (pairs.length === 0)
    return ' '

  let bestCost = Infinity
  let best: { glyph: GlyphCandidate, pair: ColorPair } | undefined

  for (const pair of pairs) {
    for (const glyph of ALL_GLYPHS) {
      // forceSingleColor glyphs only make sense without a bg fill.
      if (glyph.forceSingleColor && pair.bg !== undefined)
        continue
      const c = cellCost(subs, glyph, pair)
      if (c < bestCost) {
        bestCost = c
        best = { glyph, pair }
      }
    }
  }

  return paintGlyph(best!.glyph, best!.pair)
}
