import type { Lab } from './oklab'
import skmeans from 'skmeans'
import { labDist2 } from './oklab'

export interface ClusterResult {
  centers: Lab[]
  // for each input sample: index of the centre it was assigned to
  assignments: number[]
}

// Threshold under which all samples are deemed close enough → single cluster.
// 0.05 ≈ ~JND in OkLab (so 0.05² = 0.0025).
const SINGLE_CLUSTER_VAR = 0.0025

function variance(samples: Lab[]): number {
  if (samples.length <= 1)
    return 0
  let mL = 0
  let ma = 0
  let mb = 0
  for (const s of samples) {
    mL += s.L
    ma += s.a
    mb += s.b
  }
  const n = samples.length
  const c: Lab = { L: mL / n, a: ma / n, b: mb / n }
  let v = 0
  for (const s of samples) v += labDist2(s, c)
  return v / n
}

function meanLab(samples: Lab[]): Lab {
  let L = 0
  let a = 0
  let b = 0
  for (const s of samples) {
    L += s.L
    a += s.a
    b += s.b
  }
  const n = samples.length || 1
  return { L: L / n, a: a / n, b: b / n }
}

export function clusterColors(samples: Lab[], k: 1 | 2): ClusterResult {
  if (samples.length === 0)
    return { centers: [], assignments: [] }
  if (k === 1 || samples.length === 1 || variance(samples) < SINGLE_CLUSTER_VAR) {
    const c = meanLab(samples)
    return { centers: [c], assignments: samples.map(() => 0) }
  }

  const data = samples.map(s => [s.L, s.a, s.b] as number[])
  // skmeans++ init for stability; k=2 always here.
  const res = skmeans(data, 2, 'kmpp', 32)
  const centers: Lab[] = res.centroids.map((c: number[]) => ({ L: c[0], a: c[1], b: c[2] }))
  // skmeans may return a single centroid if all points coincide; pad.
  if (centers.length === 1)
    return { centers, assignments: samples.map(() => 0) }
  return { centers, assignments: res.idxs as number[] }
}
