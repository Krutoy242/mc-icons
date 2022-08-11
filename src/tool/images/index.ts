import { createReadStream, existsSync, mkdirSync, readFileSync } from 'fs'
import { copyFile } from 'fs/promises'
import { join, parse } from 'path'

import _ from 'lodash'
import hash from 'object-hash'
import { PNG } from 'pngjs'

import { tree } from '../../Tree'

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

export const imageHashMap: { [hash: string]: string } = {}

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
    getHash(imgPath)
      .then((imgHash) => {
        const found = imageHashMap[imgHash]
        if (found) return resolve({ imgHash })

        imageHashMap[imgHash] = (newImgPath ?? imgPath)
          .replace(/^i\\/, '') // remove folder
          .replace(/\.png$/, '') // remove ext
          .replace(/\\/g, '/') // replace path slash
        if (newImgPath === undefined) return resolve({ imgHash })

        newHash = imgHash
        return copyFile(imgPath, newImgPath)
      })
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

        // If this icon is blacklisted
        // do not add image to hashes nor files
        // if (isBlacklisted(base)) return Promise.resolve()

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

// function isBlacklisted(base: ImageBase): boolean {
//   if(!base.nbtHash) return false

//   const sNbt = getsNbt(base.nbtHash)
//   if(!sNbt) throw new Error('Request nbt but its not stored previously: '+String(base))

//   return false
// }
