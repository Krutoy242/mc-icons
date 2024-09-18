import process from 'node:process'
import fast_glob from 'fast-glob'
import fse from 'fs-extra'
import { callInChunks } from '../lib/chunk'

const { unlink } = fse

export default async function prune() {
  const dirs = fast_glob.sync('i/*', { onlyDirectories: true })

  console.log('Total Directories:', dirs.length)

  for (const dir of dirs) {
    const allImages = fast_glob.sync(`${dir}/*.png`)
    // console.log('  In folder', dir, '-', allImages.length)

    const map = new Map<string, string[]>()
    for (const imagePath of allImages) {
      const match = imagePath.match(/i\/(?<id>[^/]+\/.+?__\d+)__(?<nbtHash>[a-z\d]+).png/)
      if (!match)
        continue
      const { id } = match.groups as Record<string, string>
      if (id === 'forge/bucketfilled__0')
        continue
      map.set(id, (map.get(id) ?? []).concat([imagePath]))
    }

    const removeTreshold = 1000

    await callInChunks(
      [...map].filter(([,paths]) => paths.length >= removeTreshold),
      ([,paths]) => Promise.all(paths.map(f => unlink(f))),
    )
  }
}

// Launch file
if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  await prune()
  process.exit(0)
}
