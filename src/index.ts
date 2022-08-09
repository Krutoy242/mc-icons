#!/usr/bin/env node

import * as fs from 'fs-extra'
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
    default: 'https://github.com/Krutoy242/E2E-E-icons/raw/main/x32/',
  },
  silent: { alias: 's', type: 'boolean', describe: 'Do not any prompt' },
} as const

export type CliOpts = {
  [key in keyof typeof yargsOpts]: string | number
}

const argv = yargs(process.argv.slice(2))
  .options(yargsOpts)
  .version(false)
  .help('help')
  .wrap(null)
  .parseSync()

bracketsSearch(
  argv as unknown as CliOpts,
  fs.readFileSync(argv.input, 'utf8'),
  (replaced) => fs.writeFileSync(argv.input, replaced)
)
