# ![img](https://git.io/JLhnf) E2E-E Icons

This TS-Node CLI app designed to automatically turn text in Markdown files into Minecraft's item icons, parsing their names or brackets.

![Cli program demonstartion](https://i.imgur.com/WUMQmi3.gif)

## Examples

Modpack [Enigmatica 2: Expert - Extended](https://www.curseforge.com/minecraft/modpacks/enigmatica-2-expert-extended) using this tool for [changelogs](https://github.com/Krutoy242/Enigmatica2Expert-Extended/blob/master/CHANGELOG.md).

| This string                           | Turns into this                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [Iron Ingot] [Anvil] [Triple Battery] | ![](https://git.io/JLjca 'Iron Ingot') ![](https://git.io/JLjcu 'Anvil') ![](https://git.io/JP66y 'Triple Battery') |

### Other examples

Note that we can mark different `mods` or `metas` for same names

<table>
<tr><td>
<strong>Before iconification:</strong>
</td><td>
<strong>After iconification:</strong>
</td></tr>
<td>

[Amber] (Biomes O' Plenty)  
[Lens] (AA)  
[Futura Block] (5)  

---

[Basalt] (advancedrocketry)  
[Basalt] (Chisel)  
[Basalt] (EM)  

</td>
<td>

![](https://git.io/Jw3pq 'Amber')  
![](https://git.io/JLhj8 'Lens')  
![](https://git.io/JLjsJ 'Futura Block')  

---

![](https://git.io/JLjsf 'Basalt Sediment')  
![](https://git.io/JP66S 'Basalt')  
![](https://git.io/JLjnZ 'Basalt')  

</td>
</tr>
</table>

## Usage

1. Install latest **NodeJS** for [Windows](https://nodejs.org/en/download/current/) or [Unix](https://nodejs.org/en/download/package-manager/)

2. Create Markdown file with strings of form `[Item Name] (optional_mod_name)`

3. Run `mc-icons` with input file path
    ```sh
    > npx mc-icons --input=README.md
    ```
4. Input file would be changed in place

## Options

`> npx mc-icons --help` output:

```
-i, --input     Input file path
-t, --treshold  Levenshtein name mistake treshold
-s, --silent    Do not any prompt
    --help      Show help

-r, --repo      Repository to make short links to
                default "https://github.com/Krutoy242/E2E-E-icons/raw/main/x32/"
```

## Contributing

Some 1.12 Minecraft modpacks in addition to `E2E-E` have items that are not on the list.  
You need to add these icons in the folder `./x32/` and update the `.json` files.

1. Fork this repo on local machine, install dependensies `> npm install`
2. Launch your Minecraft with [IconExporter](https://www.curseforge.com/minecraft/mc-mods/iconexporter) mod. Join world, run command to generate all icons:
  ```sh
  /iconexporter export 32
  ```
3. Move all created icons to folder `./x32/` without replacing
4. Run `> npm run preparse` to generate `.json` mapping files
5. Add, commit, push.
6. Create PullRequest to main repo, to enlarge item dictionary. If you dont want to wait before PR would be accepted, use `--repo=` option to your fork.

## Author

* https://github.com/Krutoy242