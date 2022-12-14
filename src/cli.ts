#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs-extra'
import yargs from 'yargs'

import { bracketsSearch } from './searcher'

const yargsOpts = {
  treshold: {
    alias: 't',
    type: 'number',
    describe: 'Levenshtein name mistake treshold',
    default: 0,
  },
  repo: {
    alias: 'r',
    type: 'string',
    describe: 'Repository to make short links to',
    default: 'https://github.com/Krutoy242/mc-icons/raw/master/i/',
  },
  modpack: {
    alias: 'm',
    type: 'string',
    describe: 'Modpack shortand to filter icons, "e2ee" for example',
  },
  silent: { alias: 's', type: 'boolean', describe: 'Do not any prompt' },
} as const

interface OptsTypes {
  string: string
  boolean: boolean
  number: number
}

export type CliOpts = {
  [K in keyof typeof yargsOpts]: OptsTypes[typeof yargsOpts[K]['type']]
}

const argv = yargs(process.argv.slice(2))
  .options(yargsOpts)
  .command('<input>', 'input file to mutate', (yargs) => {
    yargs.positional('input', {
      describe: 'input file to mutate',
      type: 'string',
    })
  })
  .version(false)
  .help('help')
  .wrap(null)
  .parseSync()

const filePath = argv._[0] as string

if (!filePath) {
  console.error(`File path must be provided`)
  process.exit(1)
}
if (!existsSync(filePath)) {
  console.error(`File ${filePath} doesn\'t exist`)
  process.exit(1)
}

bracketsSearch(
  argv as CliOpts,
  readFileSync(filePath as string, 'utf8'),
  (replaced) => writeFileSync(filePath as string, replaced)
)
