/**
 * `pnpm data` — the single, fool-proof data-regeneration command.
 *
 * Replaces the manual `preparse` + `add-new-images` dance:
 *   1. Resolves where your Minecraft instance / icon exports / modpack id are,
 *      remembering them in `mcicons.config.json` (gitignored). First run is
 *      interactive with auto-detected suggestions; later runs are silent.
 *   2. Runs the existing {@link init} preparse pipeline.
 *   3. Force-stages the freshly written icons and the rebuilt database so you
 *      never call `git add -f i` by hand.
 *
 * Interactive prompts only fire when config is missing/invalid or `--reconfigure`
 * is passed, so CI / scripted runs stay non-interactive.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import chalk from 'chalk'
import { defineCommand, runMain } from 'citty'
import fast_glob from 'fast-glob'
import { PROJECT_ROOT } from '../lib/projectRoot'
import prune from './prune'

const CONFIG_PATH = resolve(PROJECT_ROOT, 'mcicons.config.json')

interface DataConfig {
  /** Absolute path to the Minecraft instance (must contain `exports/nameMap.json`). */
  mc: string
  /** IconExporter output sub-folder, relative to `mc` (e.g. `icon-exports-x64`). Empty to skip. */
  icons: string
  /** Modpack short id used to tag which mods belong to the pack (e.g. `e2ee`). */
  modpack: string
}

/** A Minecraft instance is usable only if JEIExporter has dumped its name map. */
function isInstance(dir: string): boolean {
  return existsSync(join(dir, 'exports', 'nameMap.json'))
}

/** Glob the usual launcher locations for instances that already have exports. */
function detectInstances(): string[] {
  const home = homedir()
  const appData = process.env.APPDATA ?? join(home, 'AppData', 'Roaming')
  const roots = [
    join(home, 'curseforge', 'minecraft', 'Instances'),
    join(home, 'Documents', 'curseforge', 'minecraft', 'Instances'),
    join(appData, 'PrismLauncher', 'instances'),
    join(appData, 'gdlauncher_next', 'instances'),
    join(appData, '.minecraft'),
    'D:/mc',
    'C:/mc',
  ]
  const found = new Set<string>()
  for (const root of roots) {
    if (!existsSync(root))
      continue
    if (isInstance(root)) {
      found.add(root.replace(/\\/g, '/'))
      continue
    }
    // Direct children only — instances live one level under these roots.
    for (const child of fast_glob.sync('*/exports/nameMap.json', { cwd: root, absolute: true }))
      found.add(resolve(child, '..', '..').replace(/\\/g, '/'))
  }
  return [...found]
}

function detectIconFolders(mc: string): string[] {
  return fast_glob.sync('icon-exports*', { cwd: mc, onlyDirectories: true })
}

function readConfig(): Partial<DataConfig> {
  if (!existsSync(CONFIG_PATH))
    return {}
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  }
  catch {
    return {}
  }
}

function writeConfig(cfg: DataConfig): void {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(cfg, null, 2)}\n`)
}

/**
 * Ask the user to pick one of `choices` (numbered) or type a custom value.
 * Pressing Enter keeps `fallback` when provided.
 */
async function ask(
  rl: ReturnType<typeof createInterface>,
  question: string,
  choices: string[],
  fallback?: string,
): Promise<string> {
  if (choices.length) {
    console.log(chalk.bold(`\n${question}`))
    choices.forEach((c, i) => console.log(`  ${chalk.cyan(String(i + 1))}. ${c}`))
    console.log(`  ${chalk.cyan('0')}. ${chalk.gray('Enter a custom value')}`)
  }
  const hint = fallback ? chalk.gray(` [${fallback}]`) : ''
  const promptLine = choices.length
    ? `Choose 0-${choices.length} or type a path${hint}: `
    : `${question}${hint}: `

  const answer = (await rl.question(promptLine)).trim()
  if (!answer)
    return fallback ?? ''

  if (choices.length) {
    const n = Number(answer)
    if (Number.isInteger(n) && n >= 1 && n <= choices.length)
      return choices[n - 1]
    if (answer === '0') {
      const custom = (await rl.question('Custom value: ')).trim()
      return custom || (fallback ?? '')
    }
  }
  return answer // treat as a directly typed value (e.g. a path)
}

/** Resolve a complete, validated config, prompting only when necessary. */
async function resolveConfig(reconfigure: boolean): Promise<DataConfig> {
  const saved = readConfig()

  const haveValid
    = !reconfigure
      && !!saved.mc
      && isInstance(saved.mc)
      && saved.modpack !== undefined
      && saved.icons !== undefined
  if (haveValid) {
    console.log(chalk.gray(`Using config ${CONFIG_PATH}`))
    return saved as DataConfig
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    // --- Minecraft instance ---
    let mc = saved.mc && isInstance(saved.mc) ? saved.mc : ''
    while (!mc) {
      const candidates = detectInstances()
      const picked = await ask(
        rl,
        'Path to your Minecraft instance (folder with exports/nameMap.json):',
        candidates,
        saved.mc,
      )
      const abs = resolve(picked).replace(/\\/g, '/')
      if (isInstance(abs)) {
        mc = abs
      }
      else {
        console.log(chalk.red(`  ✗ ${abs} has no exports/nameMap.json — run JEIExporter export first.`))
      }
    }

    // --- IconExporter folder ---
    const iconChoices = detectIconFolders(mc)
    const icons = await ask(
      rl,
      'IconExporter sub-folder (relative to the instance, empty to skip):',
      iconChoices,
      saved.icons ?? iconChoices[0] ?? '',
    )

    // --- Modpack short id ---
    const modpack = await ask(
      rl,
      'Modpack short id (used to tag which mods belong to the pack, e.g. e2ee):',
      [],
      saved.modpack ?? 'e2ee',
    )

    const cfg: DataConfig = { mc, icons, modpack }
    writeConfig(cfg)
    console.log(chalk.green(`\n✓ Saved ${CONFIG_PATH}`))
    return cfg
  }
  finally {
    rl.close()
  }
}

/** Force-stage the regenerated icons + database (the old `add-new-images` step). */
function stageOutputs(): void {
  try {
    execFileSync('git', ['add', '-f', 'i', 'assets/assets.db'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    })
    console.log(chalk.green('✓ Staged i/ and assets/assets.db'))
  }
  catch {
    console.log(chalk.yellow('⚠ Could not stage files (not a git repo?) — add i/ and assets/assets.db manually.'))
  }
}

const main = defineCommand({
  meta: {
    name: 'data',
    description: 'Regenerate the icon database from your Minecraft instance and stage the result.',
  },
  args: {
    'reconfigure': {
      type: 'boolean',
      description: 'Re-run the interactive setup even if a config already exists',
      default: false,
    },
    'no-overwrite': {
      type: 'boolean',
      description: 'Keep existing .png files, only fill in missing data',
      default: false,
    },
    'prune': {
      type: 'boolean',
      description: 'Prune over-common icons after regenerating',
      default: false,
    },
    'no-stage': {
      type: 'boolean',
      description: 'Do not git-add the result',
      default: false,
    },
  },
  async run({ args }) {
    const { init } = await import('./preparse')
    const cfg = await resolveConfig(!!args.reconfigure)

    await init({
      mc: cfg.mc,
      modpack: cfg.modpack,
      icons: cfg.icons || undefined,
      overwrite: !args['no-overwrite'],
    })

    if (args.prune)
      await prune()

    if (!args['no-stage'])
      stageOutputs()

    console.log(chalk.green.bold('\n✓ Data regenerated.'))
    process.exit(0)
  },
})

runMain(main)
