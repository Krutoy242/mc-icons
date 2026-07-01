import type { Buffer } from 'node:buffer'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { Box, render, Text } from 'ink'
import React from 'react'
import sharp from 'sharp'
import { Canvas, loadImage } from 'skia-canvas'
import { PROJECT_ROOT } from '../lib/projectRoot.js'
import { getSpriteImages, iconTextureSize, rowCount } from '../lib/sprite.js'
import { CELL_COLS } from '../picker/pixels.js'
import { renderImageLines } from '../picker/render/index.js'

interface Thumb { key: string, lines: string[] }

interface ProgressState {
  done: number
  total: number
  thumbs: Thumb[]
  status: string
}

function Progress({ done, total, thumbs, status }: ProgressState) {
  return (
    <Box flexDirection="column">
      <Text>{`Images: ${done} / ${total}`}</Text>
      <Box flexDirection="row">
        {thumbs.map(t => (
          <Box key={t.key} marginRight={1}>
            <Text>{t.lines.join('\n')}</Text>
          </Box>
        ))}
      </Box>
      {status ? <Text>{status}</Text> : null}
    </Box>
  )
}

interface ProgressPatch {
  done?: number
  total?: number
  thumb?: Thumb
  status?: string
}

async function createSprite(report: (patch: ProgressPatch) => void) {
  const imageList = getSpriteImages()

  const rowAmount = rowCount(imageList.length)
  const size = rowAmount * iconTextureSize

  const canvas = new Canvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  let i = 0
  for (const img of imageList) {
    const imgSrc = resolve(PROJECT_ROOT, 'i', `${img}.png`)
    const x = i % size
    const y = ((i / size) | 0) * iconTextureSize
    let drawn = false
    if (existsSync(imgSrc)) {
      ctx.drawImage(await loadImage(imgSrc), x, y, iconTextureSize, iconTextureSize)
      drawn = true
    }
    else {
      ctx.fillText('?', x, y)
    }
    i += iconTextureSize
    if (x === 0 && drawn) {
      report({
        done: i / iconTextureSize,
        total: imageList.length,
        thumb: { key: img, lines: await renderImageLines(imgSrc) },
      })
    }
  }

  report({ status: 'Minify...' })

  const oldBuffer = await canvas.toBuffer('png')
  const newBuffer = await optimize(oldBuffer)

  const ratio = (((newBuffer.length / oldBuffer.length) * 1000) | 0) / 1000
  report({ status: `Minified ${oldBuffer.length} => ${newBuffer.length} ( ${ratio} )` })

  writeFileSync(resolve(PROJECT_ROOT, 'i/sprite.png'), newBuffer)
}

function optimize(buffer: Buffer): Promise<Buffer> {
  // `palette: true` runs sharp's built-in libimagequant (same engine pngquant
  // wraps) for lossy quantization; max compressionLevel/effort is the lossless
  // pass that optipng used to do. One dependency we already ship for both.
  return sharp(buffer)
    .png({ palette: true, quality: 80, effort: 10, compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  // Keep at most a terminal-width row of recent previews
  const maxThumbs = Math.max(1, ((process.stdout.columns ?? 80) / (CELL_COLS + 1)) | 0)

  const state: ProgressState = { done: 0, total: 0, thumbs: [], status: '' }
  const instance = render(<Progress {...state} />)

  const report = (patch: ProgressPatch) => {
    if (patch.thumb)
      state.thumbs = [...state.thumbs, patch.thumb].slice(-maxThumbs)
    if (patch.done !== undefined)
      state.done = patch.done
    if (patch.total !== undefined)
      state.total = patch.total
    if (patch.status !== undefined)
      state.status = patch.status
    instance.rerender(<Progress {...state} />)
  }

  await createSprite(report)

  instance.unmount()
  await instance.waitUntilExit()
  process.exit(0)
}

// Launch file
if (import.meta.main)
  void main()
