import crypto from 'node:crypto'
import { constants, mkdirSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'

import { join, resolve as pathResolve } from 'node:path'
import FastGlob from 'fast-glob'
import sharp from 'sharp'
import { chunk } from '../lib/fp'
import { PROJECT_ROOT } from '../lib/projectRoot'
import { asset } from './assets'
import { tree } from './tree'

export function getHash(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    sharp(filePath)
      .resize(16, 16)
      .toBuffer()
      .then((data) => {
        resolve(crypto.createHash('md5').update(data).digest('hex'))
      })
      .catch(reject)
  })
}

let oldPathHash: { [newImgPath: string]: string } | undefined

export async function initOld(log: (current: number, total: number, skipped: number) => void) {
  oldPathHash = {}

  const allEntries = Object.entries(asset.images)
  const allImages = new Set(FastGlob.sync('i/*/*.png', { cwd: PROJECT_ROOT }))
  let skipped = 0
  let i = 0

  for (const [hash, img] of allEntries) {
    if (allImages.has(`i/${img}.png`)) {
      oldPathHash[img] = hash
    }
    else {
      delete asset.images[hash]
      skipped++
    }
    if (++i % 1000 === 0)
      log(i, allEntries.length, skipped)
  }

  log(allEntries.length, allEntries.length, skipped)
}

/**
 * Trim unuseful information from image path
 * @param imgPath path in format `i\minecraft\dirt.png`
 * @returns `minecraft/dirt`
 */
function trimImgPath(imgPath: string) {
  return imgPath
    .replace(/\\/g, '/') // replace path slash
    .replace(/^i\//, '') // remove folder
    .replace(/\.png$/, '') // remove ext
}

/**
 * Grab image from other folder and append it to repo
 * @returns `true` if copied, `false` if skipped - already have same image
 */
export async function appendImage(
  imgPath: string,
  newImgPath?: string,
  base?: Base,
): Promise<{ isAdded?: true, imgHash: string }> {
  // Use already stored hash if item persists
  if (oldPathHash && newImgPath) {
    const oldHash = base
      ? tree.get(base.source, base.entry, base.meta, base.nbtHash)
      : oldPathHash[trimImgPath(newImgPath)]
    if (oldHash)
      return { imgHash: oldHash }
  }

  const imgHash = await getHash(imgPath)

  if (asset.images[imgHash])
    return { imgHash } // Already have this image

  // Write new hash into map
  asset.images[imgHash] = trimImgPath(newImgPath ?? imgPath)

  // Nothing to copy
  if (newImgPath === undefined)
    return { imgHash }

  try {
    await copyFile(
      imgPath,
      pathResolve(PROJECT_ROOT, newImgPath),
      oldPathHash ? constants.COPYFILE_EXCL : undefined,
    )
  }
  catch {
    // Copy failed (e.g. destination already exists with COPYFILE_EXCL) —
    // the hash is recorded but the file was not newly added
    return { imgHash }
  }

  return { imgHash, isAdded: true }
}

type Base = Omit<Parameters<typeof tree.add>[0], 'imgHash'>

export type ImageBase = {
  /** Absolute or relative path to CWD for source image */
  filePath: string

  /** Name of current image file, `actuallyadditions__battery_bauble__0.png` */
  fileName: string

  /** Is skip substring */
  skipSubstr?: boolean
} & Base

export async function grabImages<T>(
  arr: T[],
  getBase: (icon: T) => ImageBase,
  onAdd: (isAdded: boolean, wholeLength: number, base: ImageBase) => void,
) {
  const existedDirs = new Set(FastGlob.sync('i/*', { onlyDirectories: true, cwd: PROJECT_ROOT }))
  for (const group of chunk(arr, 1000)) {
    await Promise.all(
      group.map((icon) => {
        const base = getBase(icon)

        const dest = `i/${base.source}`
        if (!existedDirs.has(dest)) {
          mkdirSync(pathResolve(PROJECT_ROOT, dest))
          existedDirs.add(dest)
        }

        const newFileName = base.skipSubstr
          ? base.fileName
          : base.fileName.substring(base.source.length + 2)

        const p = appendImage(base.filePath, join(dest, newFileName), base)
        p.then((res) => {
          tree.add({ ...base, imgHash: res.imgHash })
          onAdd(!!res.isAdded, arr.length, base)
        })
        return p
      }),
    )
  }
}
