#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import { discordMode } from './discord'
import { bracketsSearch } from './searcher'

export interface CliOpts {
  treshold: number
  max: number
  repo: string
  modpack: string
  silent: boolean
  short: boolean
  discord: boolean
}

const main = defineCommand({
  meta: {
    name: 'mc-icons',
    description: 'Parsing markdown file to replace item names into item icons.',
  },
  args: {
    input: {
      type: 'positional',
      required: false,
      description: 'input file to mutate',
    },
    treshold: {
      type: 'string',
      alias: ['t', 'threshold'],
      description: 'Levenshtein name mistake threshold',
      default: '0',
    },
    max: {
      type: 'string',
      alias: 'x',
      description: 'Maximum amount of icons in multiple results',
      default: '64',
    },
    repo: {
      type: 'string',
      alias: 'r',
      description: 'Repository to make short links to',
      // jsDelivr CDN is globally cached; raw.githubusercontent.com is rate-limited and uncached
      default: 'https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/',
    },
    modpack: {
      type: 'string',
      alias: 'm',
      description: 'Modpack shortand to filter icons, "e2ee" for example',
    },
    silent: {
      type: 'boolean',
      alias: 's',
      description: 'Do not any prompt',
    },
    short: {
      type: 'boolean',
      alias: 'o',
      description: 'Shorten long links with is.gd',
      default: true,
    },
    discord: {
      type: 'boolean',
      alias: 'd',
      description: 'Interactive picker for Discord ANSI icons',
      default: false,
    },
  },
  async run({ args }) {
    const opts: CliOpts = {
      treshold: Number(args.treshold) || 0,
      max: Number(args.max) || 64,
      repo: args.repo,
      modpack: args.modpack ?? '',
      silent: !!args.silent,
      short: args.short,
      discord: args.discord,
    }

    if (opts.discord) {
      await discordMode(opts)
      process.exit(0)
    }

    const filePath = args.input

    if (!filePath) {
      console.error(`File path must be provided`)
      process.exit(1)
    }
    if (!existsSync(filePath)) {
      console.error(`File ${filePath} doesn't exist`)
      process.exit(1)
    }

    bracketsSearch(
      opts,
      readFileSync(filePath, 'utf8'),
      replaced => writeFileSync(filePath, replaced),
    )
  },
})

runMain(main)
