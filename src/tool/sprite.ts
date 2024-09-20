import type { Buffer } from 'node:buffer'
import type { Image } from 'skia-canvas'
import process from 'node:process'
import fse from 'fs-extra'
import imagemin from 'imagemin'
import imageminOptipng from 'imagemin-optipng'
import imageminPngquant from 'imagemin-pngquant'
import { Canvas, loadImage } from 'skia-canvas'
import terminalImage from 'terminal-image'

import terminalKit from 'terminal-kit'
import { getSpriteImages, iconTextureSize, rowCount } from '../lib/sprite'

const { terminal: term } = terminalKit

const { writeFileSync, existsSync } = fse

async function createSprite() {
  const imageList = getSpriteImages()

  const rowAmount = rowCount(imageList.length)
  const size = rowAmount * iconTextureSize

  const canvas = new Canvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  term.clear().moveTo(0, 0)
  console.log()

  let i = 0
  for (const img of imageList) {
    const imgSrc = `i/${img}.png`
    const x = i % size
    const y = ((i / size) | 0) * iconTextureSize
    let imgObj
    if (existsSync(imgSrc)) {
      imgObj = await loadImage(imgSrc)
      ctx.drawImage(imgObj, x, y, iconTextureSize, iconTextureSize)
    }
    else {
      ctx.fillText('?', x, y)
    }
    i += iconTextureSize
    if (x === 0) {
      if (imgObj) {
        term.saveCursor()
        term.moveTo(0, 0)('Images: ', i / iconTextureSize, ' / ', imageList.length)
        term.restoreCursor()

        await drawTerminalImage(imgObj, iconTextureSize)
      }
    }
  }

  console.log('\nMinify...')
  // writeFileSync('i/sprite.png', await canvas.toBuffer('png'))

  const oldBuffer = await canvas.toBuffer('png')
  const newBuffer = await optimize(oldBuffer)

  console.log(
    '  Minified',
    oldBuffer.length,
    '=>',
    newBuffer.length,
    '(',
    (((newBuffer.length / oldBuffer.length) * 1000) | 0) / 1000,
    ')',
  )
  writeFileSync('i/sprite.png', newBuffer)
}

function optimize(buffer: Buffer) {
  return imagemin.buffer(buffer, {
    plugins: [
      imageminPngquant({ quality: [0.6, 0.8] }), // Lossy compression with pngquant
      imageminOptipng({ optimizationLevel: 3 }), // Lossless compression with optipng
    ],
  })
}

let cursorX = 0
async function drawTerminalImage(img: Image, imgSize: number) {
  const canvas = new Canvas(imgSize, imgSize)
  canvas.getContext('2d').drawImage(img, 0, 0, imgSize, imgSize)

  const lines = await terminalImage.buffer(
    await canvas.toBuffer('png'),
    { width: imgSize },
  )

  printAtCursor(lines)
  term.right(16)

  // More cursor
  cursorX += 16
  if (term.width - 16 < cursorX) {
    console.log('\n'.repeat(16))
    cursorX = 0
  }
}

function printAtCursor(text: string) {
  const lines = text.split('\n')
  lines.forEach((l) => {
    term.saveCursor()(l).restoreCursor().down(1)
  })
  term.up(lines.length)
}

// Launch file
if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  await createSprite()
  process.exit(0)
}
