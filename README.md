# ![img](https://git.io/JLhnf) E2E-E Icons

This TS-Node CLI app designed to automatically turn text in Markdown files into Minecraft's item icons, parsing their names or brackets.

![Cli program demonstartion](https://i.imgur.com/WUMQmi3.gif)

## Examples

Modpack [Enigmatica 2: Expert - Extended](https://www.curseforge.com/minecraft/modpacks/enigmatica-2-expert-extended) using this tool for [changelogs](https://github.com/Krutoy242/Enigmatica2Expert-Extended/blob/master/CHANGELOG.md).


| Description                                          | Capture                                                | Result                                                                                               |
|------------------------------------------------------|--------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| Items with exact match                               | [Beacon]                                               | ![](https://is.gd/oiTLv6 "Beacon")                                                                   |
| Item from **Minecraft** picked first                 | [Glass]                                                | ![](https://is.gd/bggvW5 "Glass")                                                                    |
| Add `(every)` inside get all items                   | [Mossy Wall (every)]                                   | ![](https://is.gd/uC6VQ2 "Mossy Cobblestone Wall")![](https://is.gd/wiuAOR "Mossy Stone Brick Wall") |
| Add `(any)` inside to pick only one                  | [Mossy Wall (any)]                                     | ![](https://is.gd/uC6VQ2 "Mossy Cobblestone Wall")                                                   |
| Specify mod in parenth                               | [Green wall] (Actually Additions)                      | ![](https://is.gd/wxi3cX "Ethetic Green Wall")                                                       |
| You can use mod **shortand**<br/>or **abbreviature** | [Green wall] (actual)<br/>[Green wall] (EM)            | ![](https://is.gd/wxi3cX "Ethetic Green Wall")![](https://is.gd/PR2MS1 "Green Alabaster Wall")       |
| Use `(fluid)` postfix to get fluid                   | [Enriched Lava] (fluid)                                | ![](https://is.gd/XPxBoQ "Enriched Lava")                                                            |
| Use numbers `(4)` as metadata                        | [Futura Block] (4)<br/>[Futura Block] (5)              | ![](https://is.gd/eGPYzG "Futura Block")![](https://git.io/JLjsJ 'Futura Block')                     |
| Capture by id **[&lt;mod:name:meta:{tag}>]**         | `[<tconstruct:large_plate:0:{Material:"fierymetal"}>]` | ![](https://is.gd/Zza0WL "Fiery Large Plate")                                                        |
| Output first items if all have same icon             | [Advanced Pocket] (CC)                                 | ![](https://is.gd/m64erK "Advanced Pocket Computer")                                                 |


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
    --help      Show help
-t, --treshold  Levenshtein name mistake treshold
-s, --silent    Do not any prompt
-m, --modpack   Modpack shortand to filter icons, "e2ee" for example

-r, --repo      Repository to make short links to
                default "https://github.com/Krutoy242/mc-icons/raw/master/i/"
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