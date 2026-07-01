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

1. Install latest **NodeJS** for [Windows](https://nodejs.org/en/download/current/) or [Unix](https://nodejs.org/en/download/package-manager/)

2. Create Markdown file with strings of form `[Item Name] (options)`

3. Run `mc-icons` with input file path
    ```sh
    > npx mc-icons README.md
    ```
4. Input file would be changed in place

## Options

`> npx mc-icons --help` output:

```
-t, --treshold    Levenshtein name mistake treshold  [number] [default: 0]
-x, --max         Maximum amount of icons in multiple results  [number] [default: 64]
-r, --repo        Repository to make short links to  [string] [default: "https://github.com/Krutoy242/mc-icons/raw/master/i/"]
-m, --modpack     Modpack shortand to filter icons, "e2ee" for example  [string]
-s, --silent      Do not any prompt  [boolean]
-o, --short       Shorten long links with is.gd  [boolean] [default: true]
```

## Developing

To generate icons into repo:

1. Install mods [IconExporter](https://www.curseforge.com/minecraft/mc-mods/iconexporter) and [JEIExporter](https://github.com/friendlyhj/JEIExporter).
2. Run from game `/iconexporter export 64`. Note [this issue](https://github.com/CyclopsMC/IconExporter/issues/7) and the fact that when MC window resized, it could output icons in 32x32 format despite `64` in argument.
3. Export JEI data (default `ctrl+J` hotkey, see controls).
4. Run
  ```sh
  ts-node src/tool/preparse.ts --mc=path/to/modpack --icons=icon-exports-x64 --modpack=modpack_shortand
  ```

## Author

* https://github.com/Krutoy242
