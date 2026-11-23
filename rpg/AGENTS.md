# AGENTS.md: rpg (Herdr Quest)

Follow the repo-wide rules in [`../AGENTS.md`](../AGENTS.md). This file only
adds what is specific to this theme. `$H` is `~/.config/herdr-app`.
`CLAUDE.md` in this directory is a symlink to this file.

## Facts

- Name: `herdr-quest`. The layout, theme and mod all use it.
- Files: `mods/herdr-quest/`, `layouts/herdr-quest.{json,svg}`,
  `themes/herdr-quest.json`, `keys.json` (contains only a
  `layout:herdr-quest` section).
- The layout uses only its own mod, `herdr-quest`. It needs no shipped Herdr
  mods.
- The font is bundled in `mods/herdr-quest/fonts/`, and Herdr loads it from
  there. Nothing needs to be installed system-wide.

## What to tell the person before installing

The mod doesn't use the network, and it reads no files outside its own
folder. It runs these programs:

- `exec("herdr-app", ["status"])` in `field.js`: polls for overlays to close
  so it can take keyboard focus back
- `exec("git", ["rev-parse", …])` in `menu.js`: runs in a pane's working
  directory to show the repo and worktree
- `hc(["keys", <terminal>, "esc"])` in `kit.js`: sends Esc to a terminal

It stores the hero's position in `$H/data/herdr-quest/`. That is per-user
state, so never copy it into the repo.

## Install / uninstall

First tell the person what the mod runs (see above). Then, from the repo root:

```sh
./herdr-theme install rpg --dry-run   # show the plan; stops on clashes or key conflicts
./herdr-theme install rpg             # copy, merge keys (backed up), check, switch
./herdr-theme uninstall rpg           # switch to main if shown, remove files, data and keys
```

If install stops on a clash or key conflict, ask the person before you re-run
with `--force`. Never use `--force` on your own.

## Editing this theme

- `mods/herdr-quest/main.js` maps the `role` prop from
  `layouts/herdr-quest.json` to one class per file (`quests.js`, `map.js`,
  `party.js`, `field.js`, `journal.js`, `menu.js`, …). Shared drawing code
  (palette, font, glyphs, panel toggling) is in `kit.js`.
- Sprites: edit `mods/herdr-quest/art/sprites.py` and rerun it. It regenerates
  every SVG in `art/` byte-for-byte. Never hand-edit the SVGs.
- Text uses only the font's native size (16px) and code page 437 glyphs, so
  nothing falls back to another font. Keep it that way.
- Focus gotchas (verified live):
  - When a popup closes, Herdr gives the keyboard to the focused terminal. The
    mod re-focuses itself by polling `herdr-app status`.
  - Esc goes to any open popup before it reaches `layout:herdr-quest` keys.
  - The stack's `active` value in `layout()` can lag behind what's on screen.
  - `FocusHandle.focus()` throws if called during render.
  - Rapid `herdr-app do herdr-quest.<cmd>` calls get dropped. Space them about
    0.3 s apart.
- You can't script real keypresses. Ask the person to test focus and keyboard
  behavior.
- Before you commit, run `herdr-app check mods/herdr-quest` from this
  directory.
