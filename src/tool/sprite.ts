import type { Image } from 'skia-canvas'
import process from 'node:process'
import fse from 'fs-extra'
import { Canvas, loadImage } from 'skia-canvas'
import terminalImage from 'terminal-image'
import { asset } from './assets'

const { writeFileSync, existsSync } = fse

export default async function createSprite() {
  const imgSize = 16
  const imageList = Object.values(asset.images)

  const sideLength = Math.sqrt(imageList.length * imgSize ** 2)
  const size = 2 ** Math.ceil(Math.log2(sideLength))

  const canvas = new Canvas(size, size)
  const ctx = canvas.getContext('2d')

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
        await drawTerminalImage(imgObj, imgSize)
      }
    }

    // if (y > 10 * imgSize)
    //   break
  }

  writeFileSync('i/sprite.png', await canvas.toBuffer('png'))
}

async function drawTerminalImage(img: Image, imgSize: number) {
  const canvas = new Canvas(imgSize, imgSize)
  canvas.getContext('2d').drawImage(img, 0, 0, imgSize, imgSize)

  try {
    console.log(await terminalImage.buffer(
      await canvas.toBuffer('png'),
      { width: imgSize },
    ))
  }
  catch (error) {
    console.log(error)
  }
}

// Launch file
if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  await createSprite()
  process.exit(0)
}
