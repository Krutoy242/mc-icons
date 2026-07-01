# ![img](https://git.io/JLhnf) E2E-E Icons

This TS-Node CLI app designed to automatically turn text in Markdown files into Minecraft's item icons, parsing their names or brackets.

![Cli program demonstartion](https://i.imgur.com/WUMQmi3.gif)

## Examples

Modpack [Enigmatica 2: Expert - Extended](https://www.curseforge.com/minecraft/modpacks/enigmatica-2-expert-extended) using this tool for [changelogs](https://github.com/Krutoy242/Enigmatica2Expert-Extended/blob/master/CHANGELOG.md).

<!-- The table below is generated from `@example` rows in the source (see
     src/tool/examples.ts). Do not edit by hand — run `pnpm gen:readme`. -->
<!-- AUTOGEN:examples -->

| Description | Capture | Result |
|-------------|---------|--------|
| Ignore markdown links | `[docs](https://example.com)` | — |
| Use numbers as metadata | `[Flag] (1)`<br/>`[Flag] (0)` | ![Flag](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/openblocks/flag__1.png "Flag")![Flag](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/openblocks/flag__0.png "Flag") |
| Specify mod by name, shorthand or abbreviation | `[Ash] (forestry)`<br/>`[Green wall] (Actually Additions)`<br/>`[Fan] (cyclicmagic)` | ![Ash](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/forestry/ash__0.png "Ash")![Ethetic Green Wall](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/actuallyadditions/block_testifi_bucks_green_fence__0.png "Ethetic Green Wall")![Fan](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/cyclicmagic/fan__0.png "Fan") |
| Items with exact match | `[Beacon]` | ![Beacon](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/minecraft/beacon__0.png "Beacon") |
| Names match case-insensitively | `[beacon]` | ![Beacon](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/minecraft/beacon__0.png "Beacon") |
| Item from Minecraft picked first | `[Glass]` | ![Glass](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/minecraft/glass__0.png "Glass") |
| Output first items when all share one icon | `[Advanced Pocket] (CC)` | ![Advanced Pocket Computer](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/computercraft/pocket_computer__1.png "Advanced Pocket Computer") |
| Ignore checkbox `[x]` and empty captures | `[x]` | — |
| Unknown names are left untouched | `[ZZZNonExistentItemZZZ]` | — |
| Add (every) to get all matching items | `[Mossy Wall (every)]` | ![Mossy Cobblestone Wall](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/minecraft/cobblestone_wall__1.png "Mossy Cobblestone Wall")![Mossy Stone Brick Wall](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/quark/stonebrick_mossy_wall__0.png "Mossy Stone Brick Wall") |
| Add (any) to pick only the first match | `[Mossy Wall (any)]` | ![Mossy Cobblestone Wall](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/minecraft/cobblestone_wall__1.png "Mossy Cobblestone Wall") |
| Capture by full id `<mod:name:meta:{nbt}>` | `[<tconstruct:large_plate:0:{Material:"fierymetal"}>]`<br/>`[<minecraft:coal:1>]` | ![Fiery Large Plate](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/tconstruct/large_plate__0__b1173263.png "Fiery Large Plate")![Charcoal](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/minecraft/coal__1__89b8507a.png "Charcoal") |
| Use (fluid) postfix to get a fluid | `[Enriched Lava] (fluid)` | ![Enriched Lava](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/fluid/enrichedlava.png "Enriched Lava") |
| Predefined placeholders | `[<placeholder:pickaxe:3>][<placeholder:jackhammer:15>][<placeholder:null>]` | ![Placeholder pickaxe:3](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/placeholder/pickaxe__3.png "Placeholder pickaxe:3")![Placeholder jackhammer:15](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/placeholder/jackhammer__15.png "Placeholder jackhammer:15")![Placeholder null](https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/placeholder/null.png "Placeholder null") |

<!-- /AUTOGEN:examples -->

## Usage

No install, no setup — one command. With [NodeJS](https://nodejs.org/en/download/current/) present:

```sh
npx mc-icons README.md
```

Write `[Item Name] (options)` anywhere in a Markdown file, run the command, and
the file is rewritten in place with the matching Minecraft icons. The tool ships
prebuilt with its icon database, so the first run is ready immediately and will
interactively prompt you whenever a name is ambiguous.

## Options

`> npx mc-icons --help` output:

<!-- The block below is generated from the CLI definition in src/cli.ts.
     Do not edit by hand — run `pnpm gen:readme`. -->
<!-- AUTOGEN:cli -->

```
Parsing markdown file to replace item names into item icons. (mc-icons)

USAGE mc-icons [OPTIONS] [INPUT]

ARGUMENTS

  INPUT    input file to mutate

OPTIONS

  -t, -threshold, --treshold=<treshold>    Levenshtein name mistake threshold (Default: 0)
                        -x, --max=<max>    Maximum amount of icons in multiple results (Default: 64)
                      -r, --repo=<repo>    Repository to make short links to (Default: https://cdn.jsdelivr.net/gh/Krutoy242/mc-icons@master/i/)
                -m, --modpack=<modpack>    Modpack shortand to filter icons, "e2ee" for example
                           -s, --silent    Do not any prompt
                            -o, --short    Shorten long links with is.gd (Default: true)
                     --no-o, --no-short
                          -d, --discord    Interactive picker for Discord ANSI icons (Default: false)
```

<!-- /AUTOGEN:cli -->

## Developing

Everything is automated — you make commits, the rest regenerates and publishes itself.

### One-command setup

```sh
pnpm install
```

That's it. A `prepare` lifecycle step installs the git hooks and builds the
project, so a fresh clone is ready to work immediately. (Requires
[pnpm](https://pnpm.io/installation) — `corepack enable` if you don't have it.)

### Regenerating the icon database

Icons come from a live Minecraft instance, so this is the one step that needs
your machine's game data. Collapsed into a single command:

1. Install the [IconExporter](https://www.curseforge.com/minecraft/mc-mods/iconexporter) and [JEIExporter](https://github.com/friendlyhj/JEIExporter) mods.
2. In-game, run `/iconexporter export 64` (note [this issue](https://github.com/CyclopsMC/IconExporter/issues/7): a resized MC window can emit 32×32 despite the `64`), then export JEI data (default `ctrl+J`).
3. Run:
   ```sh
   pnpm data
   ```
   The **first run is interactive** — it auto-detects common launcher locations
   and asks for your instance path, the IconExporter sub-folder, and the modpack
   short id, then remembers them in `mcicons.config.json` (gitignored). Later
   runs are silent. It regenerates `assets/assets.db`, copies new icons into
   `i/`, and **git-stages the result for you** (no more manual `add-new-images`).
   Use `pnpm data --reconfigure` to change the saved paths.

### What happens automatically

- **On commit** (pre-commit hook, kept under ~3s): staged files are `eslint --fix`ed
  via the `eslint_d` daemon (the first commit of a session warms it in ~6s, every
  commit after is ~instant), and the README autogen blocks are regenerated only when
  their source (`src/tool/examples.ts` or `src/cli.ts`) changes.
- **On push to `master`** (GitHub Actions): CI builds & tests on Linux + Windows and
  lints on Linux; [semantic-release](https://semantic-release.gitbook.io/) then derives
  the version, tag, `CHANGELOG.md`, GitHub release, and npm publish from your commit
  messages. Publishing requires an `NPM_TOKEN` secret in the repo settings.

## Author

* https://github.com/Krutoy242
