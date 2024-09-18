import { join } from 'node:path'
import fast_glob from 'fast-glob'
import { grabImages, type ImageBase } from './images'

type HandleParams = [subfolder: string, source?: string, entry_filter?: RegExp]

export async function parseJEIEFiles(
  configuration: HandleParams[],
  mcPath: string,
  logFileAdd: (...args: any[]) => void,
) {
  for (const params of configuration) {
    await handleJEIEFile(...params)
  }

  async function handleJEIEFile(
    subfolder: string,
    source?: string,
    entry_filter?: RegExp,
  ) {
    const folder = join(join(mcPath, '/exports/items'), subfolder)
    const files = fast_glob.sync('./**/*.png', { cwd: folder }) // .slice(0, 400)

    const getBase: (icon: string) => ImageBase = (file) => {
      const name = file.replace(/\.png$/, '')
      const base = source
        ? {
            source,
            entry: !entry_filter ? name : name.replace(entry_filter, ''),
            skipSubstr: true,
          }
        : parseJEIEName(name)
      return {
        filePath: join(folder, file),
        fileName: file,
        ...base,
      }
    }

    await grabImages(files, getBase, logFileAdd)
  }
}

function parseJEIEName(fileName: string) {
  const groups = fileName.match(
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    /(?<source>.+?)__(?<entry>.+?)__(?<meta>\d+)(__(?<hash>.+))?/,
  )?.groups

  if (!groups)
    throw new Error(`File Name cannot be parsed: ${fileName}`)
  return {
    source: groups.source,
    entry: groups.entry,
    meta: Number(groups.meta) || 0,
    nbtHash: groups.hash,
  }
}
