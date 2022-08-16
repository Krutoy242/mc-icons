import fs, { createReadStream, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

import { copyFile } from 'fs-extra'
import _ from 'lodash'
import hash from 'object-hash'
import { PNG } from 'pngjs'

import { tree } from '../Tree'

import { HashMap } from './types'

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

export const imageHashMap: HashMap = {}

let oldPathHash: { [newImgPath: string]: string } | undefined

export function initOld(jsonText: string) {
  oldPathHash = {}
  const json: Record<string, string> = JSON.parse(jsonText)

  Object.entries(json).forEach(([hash, img]) => {
    ;(oldPathHash as any)[img] = hash
  })
}

function trimImgPath(imgPath: string) {
  return imgPath
    .replace(/^i\\/, '') // remove folder
    .replace(/\.png$/, '') // remove ext
    .replace(/\\/g, '/') // replace path slash
}

/**
 * Grab image from other folder and append it to repo
 * @returns `true` if copied, `false` if skipped - already have same image
 */
export function appendImage(
  imgPath: string,
  newImgPath?: string
): Promise<{ isAdded?: boolean; imgHash: string }> {
  return new Promise((resolve) => {
    let newHash: string
    let hashFnc: Promise<string> | undefined

    // Use already stored hash if item persist
    if (oldPathHash && newImgPath) {
      const oldHash = oldPathHash[trimImgPath(newImgPath)]
      if (oldHash)
        hashFnc = new Promise((resolve) => {
          resolve(oldHash)
        })
    }

    ;(hashFnc ?? getHash(imgPath))
      .then((imgHash) => {
        const found = imageHashMap[imgHash]
        if (found) return resolve({ imgHash })

        imageHashMap[imgHash] = trimImgPath(newImgPath ?? imgPath)

        if (newImgPath === undefined || oldPathHash) return resolve({ imgHash })

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

export type ImageBase = {
  /** Absolute or relative path to CWD for source image */
  filePath: string

  /** Name of current image file, `actuallyadditions__battery_bauble__0.png` */
  fileName: string

  /** Is skip substring */
  skipSubstr?: boolean
} & Omit<Parameters<typeof tree.add>[0], 'imgHash'>

export async function grabImages<T>(
  arr: T[],
  getBase: (icon: T) => ImageBase,
  onAdd: (isAdded: boolean, wholeLength: number) => void
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
        const p = appendImage(base.filePath, join(dest, newFileName))
        p.then((res) => {
          tree.add({ ...base, imgHash: res.imgHash })
          onAdd(!!res.isAdded, arr.length)
        })
        return p
      })
    )
  }
}
