import type { Image } from 'skia-canvas'
import process from 'node:process'
import fse from 'fs-extra'
import { Canvas, loadImage } from 'skia-canvas'
import terminalImage from 'terminal-image'
import terminalKit from 'terminal-kit'
import { getSpriteImages } from '../lib/sprite'

const { terminal: term } = terminalKit

const { writeFileSync, existsSync } = fse

export default async function createSprite() {
  const imgSize = 16
  const imageList = getSpriteImages()

  const sideLength = Math.sqrt(imageList.length * imgSize ** 2)
  const size = 2 ** Math.ceil(Math.log2(sideLength))

  const canvas = new Canvas(size, size)
  const ctx = canvas.getContext('2d')

  term.clear().moveTo(0, 0)
  console.log()

  let i = 0
  for (const img of imageList) {
    const imgSrc = `i/${img}.png`
    const x = i % size
    const y = ((i / size) | 0) * imgSize
    let imgObj
    if (existsSync(imgSrc)) {
      imgObj = await loadImage(imgSrc)
      ctx.drawImage(imgObj, x, y, imgSize, imgSize)
    }
    else {
      ctx.fillText('?', x, y)
    }
    i += imgSize
    if (x === 0) {
      if (imgObj) {
        term.saveCursor()
        term.moveTo(0, 0)('Images: ', i / imgSize, ' / ', imageList.length)
        term.restoreCursor()

        await drawTerminalImage(imgObj, imgSize)
      }
    }
  }

  console.log('\nSawing sprite...')
  writeFileSync('i/sprite.png', await canvas.toBuffer('png'))
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
