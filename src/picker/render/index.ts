import type { Buffer } from 'node:buffer'
import type { Sub } from './types'
import chalk from 'chalk'
import {
  CELL_COLS,
  CELL_ROWS,
  loadPixels,
  SUBPX_PER_CELL_X,
  SUBPX_PER_CELL_Y,
  SUPERSAMPLE,
} from '../pixels'
import { paintCell } from './painter'
import { readSub } from './subpixel'

export function pixelsToLines(buf: Buffer, w: number, _h: number): string[] {
  const step = SUPERSAMPLE
  const lines: string[] = []
  for (let cy = 0; cy < CELL_ROWS; cy++) {
    let row = ''
    for (let cx = 0; cx < CELL_COLS; cx++) {
      const baseX = cx * SUBPX_PER_CELL_X * step
      const baseY = cy * SUBPX_PER_CELL_Y * step
      const subs: Sub[] = []
      for (let sy = 0; sy < SUBPX_PER_CELL_Y; sy++) {
        for (let sx = 0; sx < SUBPX_PER_CELL_X; sx++) {
          subs.push(readSub(buf, w, baseX + sx * step, baseY + sy * step))
        }
      }
      row += paintCell(subs)
    }
    lines.push(row)
  }
  while (lines.length < CELL_ROWS) lines.push(' '.repeat(CELL_COLS))
  return lines
}

const PLACEHOLDER_LINE = chalk.gray('░'.repeat(CELL_COLS))
export const PLACEHOLDER_LINES: string[] = Array.from({ length: CELL_ROWS }, () => PLACEHOLDER_LINE)

export async function renderImageLines(path: string): Promise<string[]> {
  const pixels = await loadPixels(path)
  if (!pixels)
    return PLACEHOLDER_LINES
  return pixelsToLines(pixels.data, pixels.width, pixels.height)
}
