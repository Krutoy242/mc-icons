import fs from 'fs'

import { createCanvas, loadImage } from 'canvas'

const possibleToolTypes = {
  pickaxe: 'i/minecraft/stone_pickaxe__0.png',
  axe: 'i/minecraft/stone_axe__0.png',
  shears: 'i/minecraft/shears__0.png',
  shovel: 'i/minecraft/stone_shovel__0.png',
  jackhammer: 'i/advancedrocketry/jackhammer__0.png',
  scoop: 'i/forestry/scoop__0.png',
}

export async function generatePlaceholders() {
  const range = new Array(16).fill(0).map((_, i) => i)

  await Promise.all(
    range.map((level) =>
      Promise.all(
        Object.entries(possibleToolTypes).map(([toolType, imagePath]) =>
          drawMiningLevel(imagePath, toolType, level)
        )
      )
    )
  )
}

async function drawMiningLevel(
  imagePath: string,
  toolType: string,
  level: number
) {
  const canvas = createCanvas(32, 32)
  const ctx = canvas.getContext('2d')

  ctx.filter = 'contrast(1.4) sepia(1)'
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

  fs.writeFileSync(
    `i/placeholder/${toolType}__${level}.png`,
    canvas.toBuffer('image/png')
  )
}
