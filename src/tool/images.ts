import crypto from 'node:crypto'
import { constants, createReadStream } from 'node:fs'

import { join } from 'node:path'
import FastGlob from 'fast-glob'
import fse from 'fs-extra'
import _ from 'lodash'
import sharp from 'sharp'
import { asset } from './assets'
import { tree } from './tree'

const { copyFile, mkdirSync } = fse

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
  const allImages = new Set(FastGlob.sync('i/*/*.png'))
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
export function appendImage(
  imgPath: string,
  newImgPath?: string,
  base?: Base,
): Promise<{ isAdded?: true, imgHash: string }> {
  return new Promise((resolve) => {
    let newHash: string

    // Use already stored hash if item persist
    if (oldPathHash && newImgPath) {
      const oldHash = base
        ? tree.get(base.source, base.entry, base.meta, base.nbtHash)
        : oldPathHash[trimImgPath(newImgPath)]
      if (oldHash) {
        resolve({ imgHash: oldHash })
        return
      }
    }

    getHash(imgPath)
      .then((imgHash) => {
        if (asset.images[imgHash])
          return resolve({ imgHash }) // Already have this image

        // Write new hash into map
        asset.images[imgHash] = trimImgPath(newImgPath ?? imgPath)

        // Not need to copy anything
        if (newImgPath === undefined)
          return resolve({ imgHash })

        newHash = imgHash
        return copyFile(
          imgPath,
          newImgPath,
          oldPathHash ? constants.COPYFILE_EXCL : undefined,
        )
      })
      .catch(() => resolve({ imgHash: newHash }))
      .then(() => {
        resolve({ imgHash: newHash, isAdded: true })
      })
  })
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
  const existedDirs = new Set(FastGlob.sync('i/*', { onlyDirectories: true }))
  for (const chunk of _.chunk(arr, 1000)) {
    await Promise.all(
      chunk.map((icon) => {
        const base = getBase(icon)

        const dest = `i/${base.source}`
        if (!existedDirs.has(dest)) {
          mkdirSync(dest)
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
