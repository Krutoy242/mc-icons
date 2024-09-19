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
