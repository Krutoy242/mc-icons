import fs from 'node:fs'

import FastGlob from 'fast-glob'

import { Canvas, loadImage } from 'skia-canvas'
import { asset } from './assets'
import { getHash } from './images'
import { tree } from './tree'

const possibleToolTypes = {
  pickaxe: 'i/minecraft/stone_pickaxe__0.png',
  axe: 'i/minecraft/stone_axe__0.png',
  shears: 'i/minecraft/shears__0.png',
  shovel: 'i/minecraft/stone_shovel__0.png',
  jackhammer: 'i/advancedrocketry/jackhammer__0.png',
  scoop: 'i/forestry/scoop__0.png',
}

export async function generatePlaceholders() {
  for (let meta = 0; meta < 16; meta++) {
    for (const [entry, imagePath] of Object.entries(possibleToolTypes)) {
      const imgPath = await drawMiningLevel(imagePath, entry, meta)
      tree.add({
        source: 'placeholder',
        entry,
        meta,
        imgHash: await getHash(imgPath),
      })
      addName(entry, meta)
    }
  }
}

export async function registerPlaceholders() {
  for (const imgPath of FastGlob.sync('i/placeholder/*.png')) {
    const [source, entry, meta, nbtHash] = imgPath.substring(2, imgPath.length - 4).split(/__|\/|\./)
    tree.add({
      source,
      entry,
      meta: meta ? Number(meta) : undefined,
      nbtHash,
      imgHash: await getHash(imgPath),
    })
    addName(entry, meta)
  }
}

function addName(entry: string, meta?: string | number) {
  const id = `${entry}${meta ? `:${String(meta)}` : ''}`
    ;(asset.names[`Placeholder ${id}`] ??= [])
    .push(`placeholder:${id}`)
}

async function drawMiningLevel(
  imagePath: string,
  toolType: string,
  level: number,
) {
  const canvas = new Canvas(32, 32)
  const ctx = canvas.getContext('2d')

  // ctx.filter = 'contrast(1.4) sepia(1)'
  ctx.drawImage(await loadImage(imagePath), 0, 0, 32, 32)

  // Dim the icon
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = '#333D'
  ctx.fillRect(0, 0, 32, 32)
  ctx.globalCompositeOperation = 'source-over'

  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#fff'

  ctx.font = 'bold 8pt Arial'
  ctx.textAlign = 'right'
  ctx.strokeText(String(level), 32, 30)
  ctx.fillText(String(level), 32, 30)

  ctx.stroke()
  ctx.fill()

  const imgPath = `i/placeholder/${toolType}__${level}.png`
  fs.writeFileSync(imgPath, await canvas.toBuffer('png'))
  return imgPath
}
