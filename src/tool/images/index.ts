import { createReadStream, existsSync, mkdirSync, readFileSync } from 'fs'
import { copyFile } from 'fs/promises'
import { join, parse } from 'path'

import _ from 'lodash'
import hash from 'object-hash'
import { PNG } from 'pngjs'

import { Item, tree } from '../../Tree'

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

const imageHashMap: { [hash: string]: string } = {}

/**
 * Grab image from other folder and append it to repo
 * @returns `true` if copied, `false` if skipped - already have same image
 */
export function appendImage(
  imgPath: string,
  newImgPath?: string
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    getHash(imgPath)
      .then((hash) => {
        const found = imageHashMap[hash]
        if (found) return resolve(false)
        imageHashMap[hash] = newImgPath ?? imgPath
        if (newImgPath === undefined) return resolve(false)
        return copyFile(imgPath, newImgPath)
      })
      .then(() => {
        resolve(true)
      })
  })
}

export async function grabImages<T>(
  arr: T[],
  getBase: (icon: T) => {
    /** Absolute or relative path to CWD for source image */
    filePath: string

    /** Name of current image file, `actuallyadditions__battery_bauble__0.png` */
    fileName: string

    /** Is skip substring */
    skipSubstr?: boolean

    namespace: string
    name: string
    meta: number
    hash: string
    sNbt: string | undefined
  },
  onAdd: (isAdded: boolean, wholeLength: number) => void
) {
  for (const chunk of _.chunk(arr, 1000)) {
    await Promise.all(
      chunk.map((icon) => {
        const base = getBase(icon)
        tree.add(
          new Item(
            base.namespace,
            base.name,
            base.meta,
            base.hash ?? '',
            base.sNbt
          )
        )
        const dest = join('i', base.namespace)
        if (!existsSync(dest)) mkdirSync(dest)
        const newFileName = base.skipSubstr
          ? base.fileName
          : base.fileName.substring(base.namespace.length + 2)
        const p = appendImage(base.filePath, join(dest, newFileName + '.png'))
        p.then((isAdded) => {
          onAdd(isAdded, arr.length)
        })
        return p
      })
    )
  }
}
