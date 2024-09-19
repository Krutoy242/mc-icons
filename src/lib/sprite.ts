import { asset } from '../tool/assets'

// (": "\w+/[a-z]+__\d+__)(.+\n\s+"\w+\1){150}
const blacklistedItems = [
  /^enderio\/block_painted_pressure_plate__13__\w+/,
  /^thermalexpansion\/florb__.__\w+/,
  /^appliedenergistics2\/facade__0__\w+/,
  /^forestry\/can__1__\w+/,
  /^forestry\/capsule__1__\w+/,
  /^forestry\/refractory__1__\w+/,
  /^thermaldynamics\/cover__0__\w+/,
] as (string | RegExp)[]

export const iconTextureSize = 16

export function getSpriteImages() {
  return Object.values(asset.images)
    .filter(
      imgPath => !blacklistedItems.some(
        f => typeof f === 'string'
          ? f === imgPath
          : f.test(imgPath),
      ),
    )
}

let spriteMap: Record<string, string>
export function getPos(imgPath: string) {
  if (!spriteMap) {
    const imageList = getSpriteImages()
    const rowAmount = rowCount(imageList.length)

    spriteMap = Object.fromEntries(
      imageList
        .map((imgPath, i) => [
          imgPath,
          `${(i % rowAmount) * iconTextureSize} ${
            ((i / rowAmount) | 0) * iconTextureSize}`,
        ]),
    )
  }
  return spriteMap[imgPath]
}

export function rowCount(total: number) {
  return 2 ** Math.ceil(Math.log2(Math.sqrt(total)))
}
