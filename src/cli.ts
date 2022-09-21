#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs-extra'
import yargs from 'yargs'

import { bracketsSearch } from './searcher'

const yargsOpts = {
  input: {
    alias: 'i',
    type: 'string',
    describe: 'Input file path',
    default: 'README.md',
  },
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
  .version(false)
  .help('help')
  .wrap(null)
  .parseSync()

bracketsSearch(argv as CliOpts, readFileSync(argv.input, 'utf8'), (replaced) =>
  writeFileSync(argv.input, replaced)
)
