# herdr-themes

Themes for Herdr. Each directory is one theme, laid out
like `~/.config/herdr-app/` so its files can be copied straight in.

## Themes

| Theme | What it is |
| --- | --- |
| [`rpg/`](rpg) | **Herdr Quest** — a pixel-art RPG layout, theme and mod. |

## Installing a theme

```sh
cp -R rpg/mods/*    ~/.config/herdr-app/mods/
cp    rpg/layouts/* ~/.config/herdr-app/layouts/
cp    rpg/themes/*  ~/.config/herdr-app/themes/
```

Then merge the theme's `keys.json` block into `~/.config/herdr-app/keys.json`
and pick the layout in Herdr.
