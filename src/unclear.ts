import type { CliOpts } from './cli'
import type { RgxExecIconMatch } from './iconizeMatch'
import type { PickerOption } from './picker'
import type { DictEntry } from './searcher'

import { resolve } from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import _ from 'lodash'
import { getIcon } from './getIcon'
import { PROJECT_ROOT } from './lib/projectRoot'
import { pick } from './picker'

type NonEmptyArray<T> = [T, ...T[]]

function linesOfMatch(match: RgxExecIconMatch, lines = 0): string {
  let k = lines
  let start = match.index
  while (start-- && (match.input[start] !== '\n' || k--));

  k = lines
  let end = match.index
  while (match.input.length > ++end && (match.input[end] !== '\n' || k--));

  return ` in line:\n${chalk.gray(match.input.substring(start, end))}`
}

function isRemote(repo: string): boolean {
  return /^https?:\/\//i.test(repo)
}

function imagePathFor(argv: CliOpts, d: DictEntry): string | undefined {
  if (isRemote(argv.repo))
    return undefined
  const rel = getIcon([d.source, d.entry, d.meta, d.sNbt])
  if (!rel)
    return undefined
  return resolve(PROJECT_ROOT, argv.repo, `${rel}.png`)
}

function buildOption(argv: CliOpts, d: DictEntry): PickerOption {
  return {
    name: d.name,
    modname: d.modname,
    caption: `${d.source}:${d.entry}:${d.meta || 0}`,
    footnote: d.sNbt
      ? (d.sNbt.length > 50 ? `${d.sNbt.substring(0, 49)}…` : d.sNbt)
      : undefined,
    imagePath: imagePathFor(argv, d),
  }
}

export class Unclear {
  private unfounds: string[] = []

  constructor(private argv: CliOpts) {}

  print(): void {
    if (this.argv.silent)
      return

    if (this.unfounds.length) {
      const unfounds = this.unfounds as NonEmptyArray<string>
      console.log(chalk.bgGrey.black('❌ can\'t be found:'))

      const maxLen = unfounds
        .map(s => s.length)
        .sort()
        .pop() as number
      const width = process.stdout.columns
      const columns = (width / (maxLen + 4)) | 0 || 1
      console.log(
        `${_.chunk(
          unfounds.map(
            s => `[${(`${chalk.bgGreen.black(s)}]`).padEnd(maxLen)}`,
          ),
          columns,
        )
          .map(r => r.join('  '))
          .join('\n')}\n`,
      )
    }
  }

  cantBeFound(capture: string): void {
    this.unfounds.push(capture)
  }

  async resolve(
    capture: string,
    full_itemArr: DictEntry[],
    match: RgxExecIconMatch,
  ): Promise<DictEntry | undefined> {
    const exactArr = full_itemArr.filter(
      r => r.name.toLowerCase() === capture.toLowerCase(),
    )
    const itemArr = exactArr.length > 1 ? exactArr : full_itemArr

    const rgx = new RegExp(_.escapeRegExp(capture), 'i')
    itemArr.sort((a, b) => Number(rgx.test(b.name)) - Number(rgx.test(a.name)))

    if (!itemArr.length || this.argv.silent) {
      this.cantBeFound(capture)
      return
    }

    const is_allItemsHasUniqNames
      = itemArr.length === _.uniqBy(itemArr, 'name').length

    const is_allModsAreDifferent = _(itemArr)
      .countBy('modid')
      .every(v => v === 1)

    const is_sameMod_metasDifferent
      = _.uniqBy(itemArr, 'modid').length === 1
        && _(itemArr)
          .countBy('meta')
          .every(v => v === 1)

    const inLine = linesOfMatch(match)
    const captureTag = chalk.bgGreen.black(` ${capture} `)

    let prompt: string
    if (is_allItemsHasUniqNames)
      prompt = `Select full name of [${captureTag}]${inLine}`
    else if (is_allModsAreDifferent)
      prompt = `Select ${chalk.bgRgb(0, 98, 143).black(' mod ')} for [${captureTag}]${inLine}`
    else if (is_sameMod_metasDifferent)
      prompt = `Select ${chalk.bgCyan.black(' meta ')} of [${captureTag}]${inLine}`
    else
      prompt = `Have no clue what you looking for [${captureTag}]${inLine}\nSelect Any variant:`

    const options = itemArr.map(d => buildOption(this.argv, d))
    const idx = await pick({ prompt, options })
    if (idx === undefined)
      return undefined
    return itemArr[idx]
  }
}
