import fs, { createReadStream, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

import { copyFile } from 'fs-extra'
import _ from 'lodash'
import hash from 'object-hash'
import { PNG } from 'pngjs'

import { asset } from './assets'
import { treeTool } from './treeTool'

function getHash(filePath: string): Promise<string> {
  return new Promise<string>((resolve) => {
    createReadStream(filePath)
      .pipe(new PNG({ filterType: 4 }))
      .on('parsed', function () {
        // eslint-disable-next-line @typescript-eslint/no-invalid-this
        resolve(hash([...this.data]))
      })
  })
}

let oldPathHash: { [newImgPath: string]: string } | undefined

export function initOld() {
  oldPathHash = {}

  for (const [hash, img] of Object.entries(asset.images)) {
    oldPathHash[img] = hash
  }
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
  base?: Base
): Promise<{ isAdded?: true; imgHash: string }> {
  return new Promise((resolve) => {
    let newHash: string

    // Use already stored hash if item persist
    if (oldPathHash && newImgPath) {
      const oldHash = base
        ? treeTool.get(base.source, base.entry, base.meta, base.nbtHash)
        : oldPathHash[trimImgPath(newImgPath)]
      if (oldHash) {
        resolve({ imgHash: oldHash })
        return
      }
    }

    getHash(imgPath)
      .then((imgHash) => {
        const found = asset.images[imgHash]
        if (found) return resolve({ imgHash }) // Already have this image

        // Write new hash into map
        asset.images[imgHash] = trimImgPath(newImgPath ?? imgPath)

        // Not need to copy anything
        if (newImgPath === undefined) return resolve({ imgHash })

        newHash = imgHash
        return copyFile(
          imgPath,
          newImgPath,
          oldPathHash ? fs.constants.COPYFILE_EXCL : undefined
        )
      })
      .catch(() => resolve({ imgHash: newHash }))
      .then(() => {
        resolve({ imgHash: newHash, isAdded: true })
      })
  })
}

type Base = Omit<Parameters<typeof treeTool.add>[0], 'imgHash'>

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
  onAdd: (isAdded: boolean, wholeLength: number, base: ImageBase) => void
) {
  for (const chunk of _.chunk(arr, 1000)) {
    await Promise.all(
      chunk.map((icon) => {
        const base = getBase(icon)

        const dest = join('i', base.source)
        if (!existsSync(dest)) mkdirSync(dest)
        const newFileName = base.skipSubstr
          ? base.fileName
          : base.fileName.substring(base.source.length + 2)
        const p = appendImage(base.filePath, join(dest, newFileName), base)
        p.then((res) => {
          treeTool.add({ ...base, imgHash: res.imgHash })
          onAdd(!!res.isAdded, arr.length, base)
        })
        return p
      })
    )
  }
}
