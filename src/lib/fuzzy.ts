import type { DictEntry } from '../searcher.js'

import levenshtein from 'fast-levenshtein'
import { BKTree } from 'mnemonist'

const distance = (a: string, b: string) => levenshtein.get(a, b)

/**
 * Original O(N) resolver: Levenshtein distance against every dictionary
 * entry, then full sort. Kept for benchmarking / fallback.
 */
export function linearResolve(
  entries: DictEntry[],
  capture: string,
  threshold: number,
  max: number,
): DictEntry[] {
  const capture_low = capture.toLowerCase()
  const levDict = entries
    .map(o => [levenshtein.get(o.name_low, capture_low), o] as [number, DictEntry])
    .sort((a, b) => a[0] - b[0])
  const t1 = levDict[0][0]
  const t2 = levDict[1]?.[0] ?? Infinity
  const isThresholdPass = t1 < t2 && t1 <= threshold
  return isThresholdPass ? [levDict[0][1]] : levDict.map(o => o[1]).slice(0, max)
}

/**
 * Metric-tree resolver. Builds a BK-tree over unique lowercased names once,
 * then answers each query by visiting only the nodes within a growing radius
 * instead of scanning the whole dictionary.
 *
 * Output mirrors {@link linearResolve}: a single entry when one strictly
 * closest match passes the threshold, otherwise the `max` closest entries
 * ordered by distance (ties broken by original dictionary order).
 */
export class FuzzyResolver {
  private tree: BKTree<string>
  private byName = new Map<string, DictEntry[]>()
  private order = new Map<DictEntry, number>()

  /** Largest radius we will grow to before giving up gathering `max` entries. */
  private static readonly RADIUS_CAP = 32

  constructor(entries: DictEntry[]) {
    entries.forEach((entry, index) => {
      this.order.set(entry, index)
      const bucket = this.byName.get(entry.name_low)
      if (bucket)
        bucket.push(entry)
      else
        this.byName.set(entry.name_low, [entry])
    })
    this.tree = BKTree.from(Array.from(this.byName.keys()), distance)
  }

  resolve(capture: string, threshold: number, max: number): DictEntry[] {
    const capture_low = capture.toLowerCase()

    // Grow the radius until we have at least `max` candidate entries
    let radius = 1
    let hits: { item: string, distance: number }[] = []
    while (true) {
      hits = this.tree.search(radius, capture_low) as typeof hits
      const count = hits.reduce(
        (n, h) => n + (this.byName.get(h.item)?.length ?? 0),
        0,
      )
      if (count >= max || radius >= FuzzyResolver.RADIUS_CAP)
        break
      radius *= 2
    }

    const scored: [number, DictEntry][] = []
    for (const hit of hits) {
      for (const entry of this.byName.get(hit.item)!)
        scored.push([hit.distance, entry])
    }
    scored.sort(
      (a, b) => a[0] - b[0] || this.order.get(a[1])! - this.order.get(b[1])!,
    )

    const t1 = scored[0]?.[0] ?? Infinity
    const t2 = scored[1]?.[0] ?? Infinity
    const isThresholdPass = t1 < t2 && t1 <= threshold
    return isThresholdPass
      ? [scored[0][1]]
      : scored.map(s => s[1]).slice(0, max)
  }
}
