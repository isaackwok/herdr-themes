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

Run these from this directory (`rpg/`):

```sh
H=~/.config/herdr-app

# 0. Make sure nothing with these names exists yet.
#    These copies overwrite silently.
ls $H/mods/herdr-quest $H/layouts/herdr-quest.* $H/themes/herdr-quest.json 2>/dev/null

# 1. Copy the files.
cp -R mods/herdr-quest              $H/mods/
cp    layouts/herdr-quest.{json,svg} $H/layouts/
cp    themes/herdr-quest.json        $H/themes/

# 2. Merge the keybindings. This only adds a "layout:herdr-quest" section.
cp $H/keys.json $H/keys.json.bak
jq -s '.[0] * .[1]' $H/keys.json.bak keys.json > $H/keys.json

# 3. Check the mod, then switch to the layout.
herdr-app check $H/mods/herdr-quest
herdr-app do layout.switch --name herdr-quest
```

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
H=~/.config/herdr-app
rm -r $H/mods/herdr-quest $H/data/herdr-quest
rm    $H/layouts/herdr-quest.{json,svg} $H/themes/herdr-quest.json
```

Then delete the `"layout:herdr-quest"` section from `$H/keys.json`.

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
