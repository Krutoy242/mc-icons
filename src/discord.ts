import type { CliOpts } from './cli'
import type { DictEntry } from './searcher'
import path from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import clipboardy from 'clipboardy'
import { AssetEx } from './assetEx'
import { getIcon } from './getIcon'
import { pick } from './picker'
import { renderImageLines } from './picker/render'

function buildOption(entry: DictEntry): import('./picker').PickerOption | undefined {
  try {
    const iconPath = getIcon([entry.source, entry.entry, entry.meta, entry.sNbt])
    if (!iconPath)
      return undefined
    return {
      name: entry.name,
      modname: entry.modname,
      caption: `${entry.source}:${entry.entry}:${entry.meta}`,
      footnote: entry.sNbt || undefined,
      imagePath: path.resolve('i', `${iconPath}.png`),
    }
  }
  catch {
    return undefined
  }
}

export async function discordMode(argv: CliOpts): Promise<void> {
  if (!process.stdin.isTTY) {
    console.error('Discord mode requires an interactive terminal.')
    process.exit(1)
  }

  const assetEx = new AssetEx(argv)
  const options = assetEx.nameDictionary
    .map(buildOption)
    .filter((o): o is NonNullable<ReturnType<typeof buildOption>> => o !== undefined)

  const idx = await pick({
    prompt: `Select an icon to copy for Discord (${options.length} options):`,
    options,
  })

  if (idx === undefined) {
    console.log('Cancelled')
    process.exit(0)
  }

  const selected = options[idx]
  if (!selected.imagePath) {
    console.error('Selected icon has no image path')
    process.exit(1)
  }

  // Force ANSI colors even if stdout is not a TTY
  const originalLevel = chalk.level
  chalk.level = 3
  const lines = await renderImageLines(selected.imagePath)
  chalk.level = originalLevel

  const ansiBlock = `\`\`\`ansi\n${lines.join('\n')}\n\`\`\``

  if (process.stdout.isTTY) {
    try {
      await clipboardy.write(ansiBlock)
      console.log(`Copied "${selected.name}" to clipboard for Discord!`)
    }
    catch (err) {
      console.error('Failed to copy to clipboard:', err instanceof Error ? err.message : err)
      console.log(ansiBlock)
    }
  }
  else {
    console.log(ansiBlock)
  }

  process.exit(0)
}
