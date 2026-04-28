export const IMAGE_W = 8
export const IMAGE_H = 4
export const GAP = 1
export const PADDING = 1
export const CARD_LINES = 4
export const CARD_W_MIN = 36
export const CARD_W_MAX = 80
export const COMPACT_HEIGHT_THRESHOLD = 10
export const FOOTER_LINES = 1

export interface LayoutInput {
  termW: number
  termH: number
  optionCount: number
  longestName: number
  promptLines: number
}

export interface Layout {
  mode: 'grid' | 'compact'
  columns: number
  visibleRows: number
  cellW: number
  cellH: number
  cardW: number
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function computeLayout(input: LayoutInput): Layout {
  const { termW, termH, optionCount, longestName, promptLines } = input

  if (termH < COMPACT_HEIGHT_THRESHOLD) {
    const visibleRows = Math.max(1, termH - promptLines - FOOTER_LINES)
    return {
      mode: 'compact',
      columns: 1,
      visibleRows: Math.min(visibleRows, optionCount),
      cellW: termW,
      cellH: 1,
      cardW: Math.max(CARD_W_MIN, termW - 4),
    }
  }

  const cardW = clamp(longestName, CARD_W_MIN, CARD_W_MAX)
  const cellInnerW = IMAGE_W + GAP + cardW
  const cellW = cellInnerW + PADDING * 2
  const cellH = IMAGE_H + PADDING * 2

  // Cells overlap their borders by 1 char (negative margins),
  // so N columns occupy: cellW * N - (N - 1) = cellW * N - N + 1
  // Solving for N: N = floor((termW - 1) / (cellW - 1))
  const columns = Math.max(1, Math.floor((termW - 1) / (cellW - 1)))
  const availableH = termH - promptLines - FOOTER_LINES
  const rowsByH = Math.max(1, Math.floor((availableH - 1) / (cellH - 1)))
  const totalRows = Math.ceil(optionCount / columns)
  const visibleRows = Math.max(1, Math.min(rowsByH, totalRows))

  return { mode: 'grid', columns, visibleRows, cellW, cellH, cardW }
}
