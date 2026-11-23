# Herdr Quest (`rpg`)

A 16-bit RPG layout for Herdr:

- spaces appear as realms on a world map
- tabs appear as quests
- agents are party members, with gauges
- in the overworld village you can walk up to an agent and talk to it

All text uses the bundled PxPlus IBM VGA 8x16 pixel font.

| | |
| --- | --- |
| Layout / theme / mod name | `herdr-quest` |
| Files | `mods/herdr-quest/`, `layouts/herdr-quest.{json,svg}`, `themes/herdr-quest.json`, `keys.json` |

For requirements and how themes in this repo work in general, see the
[root README](../README.md).

## Install

From the repo root:

```sh
./herdr-theme install rpg     # add --dry-run to preview, --force to update an existing install
```

The [root README](../README.md#installing-and-uninstalling) explains what the
script does and the manual steps.

## Keys (while this layout is shown)

| Key | Command |
| --- | --- |
| `cmd-e` | `herdr-quest.explore` |
| `escape` | `herdr-quest.escape` |
| `cmd-p` | `herdr-quest.picker` |
| `cmd-shift-p` | `herdr-quest.palette` |

## What it does on your machine

It doesn't use the network, and it reads no files outside its own folder. It
does run these programs:

- `herdr-app status`: checks whether a popup has closed, then gives keyboard
  focus back to the overworld
- `git rev-parse`: in a pane's working directory, shows the repo and worktree
  for that pane
- `hc keys <terminal> esc`: sends Esc to a terminal when you leave a
  conversation

The hero's position is saved in `~/.config/herdr-app/data/herdr-quest/`.

## Uninstall

```sh
./herdr-theme uninstall rpg   # add --keep-data to keep the hero's saved position
```

## Developing

- `mods/herdr-quest/main.js` is the entry point. It sends each layout block to
  a role, using the `role` prop set in `layouts/herdr-quest.json`. Each role is
  one file:

  | Role | File |
  | --- | --- |
  | `quests` | `quests.js` |
  | `map` | `map.js` |
  | `party` | `party.js` |
  | `field` | `field.js` |
  | `journal` | `journal.js` |
  | `menu` | `menu.js` |
  | others | one file per role, named after it |

  Shared drawing code (palette, font, glyphs) is in `kit.js`.
- The sprites are generated. Edit `mods/herdr-quest/art/sprites.py` and run
  `python3 mods/herdr-quest/art/sprites.py`, which rewrites every SVG next to
  it. Don't edit the SVGs by hand.
- Herdr hands keyboard focus to a terminal whenever a popup closes, so the mod
  takes focus back itself. If you change popups or focus handling, test it in
  the app with real keypresses.

## License

The PxPlus IBM VGA 8x16 font in `mods/herdr-quest/fonts/` is by VileR
(int10h.org), licensed under CC BY-SA 4.0. See `LICENSE-PxPlus.txt` next to
the font.
